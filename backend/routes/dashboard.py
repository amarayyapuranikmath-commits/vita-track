"""
backend/routes/dashboard.py
────────────────────────────────────────────────────────────────────────────
VitaTrack Dashboard API — single endpoint that aggregates everything the
Dashboard page needs from MongoDB, so the frontend makes ONE call.

Returns:
  - greeting + date info
  - health_score, streak, goal_completion
  - today's summary  (calories, water, steps, protein, sleep, workout)
  - goal progress    (vs profile goals)
  - bmi              (computed from profile height + latest weight log)
  - readiness_score  (computed from today/recent logs)
  - body_goal_tracker (start weight, current weight, goal weight)
  - weekly_chart     (last 7 days per metric)
  - recent_activity  (last 8 logs formatted for feed)
  - achievements     (auto-generated badges)

Design rules:
  - No new collections. Reads only: users, logs.
  - Uses get_current_user() on every route.
  - Timestamps: stored as UTC datetime.utcnow() without tz suffix.
  - All value parsing mirrors routes/ai.py parser logic exactly.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends

from core.deps import get_current_user
from database import get_database

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ═══════════════════════════════════════════════════════════════════════
# Value parsers  (mirrors ai.py — kept local to avoid coupling)
# ═══════════════════════════════════════════════════════════════════════

def _leading_num(text: str) -> float:
    m = re.search(r"[\d]+\.?[\d]*", str(text or ""))
    return float(m.group()) if m else 0.0


def _parse_water_ml(value: str) -> float:
    v = str(value or "").strip().lower()
    num = _leading_num(v)
    if "l" in v and "ml" not in v:
        num *= 1000
    return num


def _parse_sleep_hours(value: str) -> float:
    v = str(value or "").strip().lower()
    hm = re.search(r"(\d+)\s*h(?:ours?)?\s*(?:(\d+)\s*m)?", v)
    if hm:
        return round(float(hm.group(1)) + (float(hm.group(2) or 0) / 60), 2)
    num = _leading_num(v)
    if num > 24:
        return round(num / 60, 2)
    return num


def _parse_steps(value: str) -> float:
    return _leading_num(value)


def _parse_weight_kg(value: str) -> float:
    return _leading_num(value)


def _parse_meal_calories(log: Dict) -> float:
    note = log.get("note", "")
    if note and str(note).strip().startswith("{"):
        try:
            c = json.loads(note).get("calories")
            if c is not None:
                return float(c)
        except Exception:
            pass
    if log.get("calories") is not None:
        return float(log["calories"])
    m = re.search(r"([\d]+\.?[\d]*)\s*kcal", str(log.get("value", "")), re.I)
    return float(m.group(1)) if m else 0.0


def _parse_meal_protein(log: Dict) -> float:
    note = log.get("note", "")
    if note and str(note).strip().startswith("{"):
        try:
            p = json.loads(note).get("protein")
            if p is not None:
                return float(p)
        except Exception:
            pass
    if log.get("protein") is not None:
        return float(log["protein"])
    m = re.search(r"([\d]+\.?[\d]*)\s*g\s*protein", str(log.get("value", "")), re.I)
    return float(m.group(1)) if m else 0.0


def _parse_workout_minutes(value: str) -> float:
    m = re.search(r"(\d+)\s*min", str(value or ""), re.I)
    if m:
        return float(m.group(1))
    return _leading_num(value) or 30.0   # fallback: assume 30 min


# ═══════════════════════════════════════════════════════════════════════
# Height parser  — user enters "5.8" meaning 5 ft 8 in
# ═══════════════════════════════════════════════════════════════════════

def _height_to_meters(raw: str) -> Optional[float]:
    """
    '5.8'  → 5 ft 8 in → 1.727 m
    '175'  → treated as cm → 1.75 m
    '1.75' → already metres if < 3
    """
    if not raw:
        return None
    try:
        val = float(str(raw).strip())
    except ValueError:
        return None

    if val <= 0:
        return None

    # cm entered (e.g. 175)
    if val > 10:
        return round(val / 100, 4)

    # feet.inches notation (e.g. 5.8 = 5 ft 8 in)
    if 3 < val < 9:
        feet = int(val)
        inches_decimal = val - feet
        # treat decimal as inches directly: 0.8 → 8 inches (user enters 5.8)
        inches = round(inches_decimal * 10)
        total_inches = feet * 12 + inches
        return round(total_inches * 0.0254, 4)

    # already metres (e.g. 1.75)
    return round(val, 4)


# ═══════════════════════════════════════════════════════════════════════
# Goal value parsers (profile strings → floats)
# ═══════════════════════════════════════════════════════════════════════

def _goal_float(raw: Any, multiplier: float = 1.0) -> float:
    """Parse any goal field to a plain float."""
    if raw is None:
        return 0.0
    v = str(raw).lower()
    # strip units
    for unit in ["kcal", "g", "l", "ml", "hrs", "hr", "h", "steps", "kg", "lbs"]:
        v = v.replace(unit, "")
    try:
        return float(v.strip()) * multiplier
    except ValueError:
        return 0.0


def _water_goal_ml(raw: Any) -> float:
    """water_goal stored as e.g. '3' or '3L' or '3000' → ml"""
    if raw is None:
        return 2000.0
    v = str(raw).strip().lower()
    num = _leading_num(v)
    if num == 0:
        return 2000.0
    # if < 30 it's litres, else ml already
    if "ml" in v:
        return num
    if num < 30:
        return num * 1000
    return num


# ═══════════════════════════════════════════════════════════════════════
# Date helpers
# ═══════════════════════════════════════════════════════════════════════

def _utcnow() -> datetime:
    return datetime.utcnow()


def _day_start(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _days_ago(n: int) -> datetime:
    return _day_start(_utcnow()) - timedelta(days=n)


def _date_str(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


# ═══════════════════════════════════════════════════════════════════════
# DB helpers
# ═══════════════════════════════════════════════════════════════════════

async def _all_logs(user_id: str, days: int) -> List[Dict]:
    db = get_database()
    cutoff = _days_ago(days)
    cur = db["logs"].find(
        {"user_id": ObjectId(user_id), "created_at": {"$gte": cutoff}},
        sort=[("created_at", -1)],
    )
    return await cur.to_list(length=1000)


async def _today_logs(user_id: str) -> List[Dict]:
    db = get_database()
    start = _day_start(_utcnow())
    cur = db["logs"].find(
        {"user_id": ObjectId(user_id), "created_at": {"$gte": start}},
        sort=[("created_at", -1)],
    )
    return await cur.to_list(length=500)


async def _first_weight_log(user_id: str) -> Optional[Dict]:
    db = get_database()
    cur = db["logs"].find(
        {"user_id": ObjectId(user_id), "type": "weight"},
        sort=[("created_at", 1)],
    )
    docs = await cur.to_list(length=1)
    return docs[0] if docs else None


async def _latest_weight_log(user_id: str) -> Optional[Dict]:
    db = get_database()
    cur = db["logs"].find(
        {"user_id": ObjectId(user_id), "type": "weight"},
        sort=[("created_at", -1)],
    )
    docs = await cur.to_list(length=1)
    return docs[0] if docs else None


# ═══════════════════════════════════════════════════════════════════════
# Streak calculator
# ═══════════════════════════════════════════════════════════════════════

def _calc_streak(logs: List[Dict]) -> int:
    """Count consecutive days (going back from today) that have ≥1 log."""
    logged_dates = {_date_str(l["created_at"]) for l in logs if l.get("created_at")}
    streak = 0
    check = _utcnow().date()
    while _date_str(datetime.combine(check, datetime.min.time())) in logged_dates:
        streak += 1
        check -= timedelta(days=1)
    return streak


# ═══════════════════════════════════════════════════════════════════════
# Health score  (0–100)
# ═══════════════════════════════════════════════════════════════════════

def _calc_health_score(
    water_ml: float, water_goal_ml: float,
    sleep_h: float, sleep_goal_h: float,
    cal: float, cal_goal: float,
    protein_g: float, protein_goal_g: float,
    steps: float, steps_goal: float,
    workout_min: float, workout_goal_min: float,
    streak: int,
) -> int:
    def pct(got, goal):
        return min(1.0, got / goal) if goal > 0 else 0.0

    water_s   = pct(water_ml, water_goal_ml)   * 15
    sleep_s   = pct(sleep_h, sleep_goal_h)     * 15
    cal_s     = pct(cal, cal_goal)             * 15
    protein_s = pct(protein_g, protein_goal_g) * 15
    steps_s   = pct(steps, steps_goal)         * 15
    workout_s = pct(workout_min, workout_goal_min) * 15
    streak_s  = min(streak / 30, 1.0)          * 10

    return round(water_s + sleep_s + cal_s + protein_s + steps_s + workout_s + streak_s)


# ═══════════════════════════════════════════════════════════════════════
# Readiness score  (0–100)
# ═══════════════════════════════════════════════════════════════════════

def _calc_readiness(
    sleep_h: float, sleep_goal_h: float,
    water_ml: float, water_goal_ml: float,
    steps: float, steps_goal: float,
    protein_g: float, protein_goal_g: float,
    workout_today: bool
) -> int:
    # Use fallback averages internally if goal not set so readiness still functions
    sg = sleep_goal_h if sleep_goal_h > 0 else 8.0
    wg = water_goal_ml if water_goal_ml > 0 else 2000.0
    stg = steps_goal if steps_goal > 0 else 8000.0
    pg = protein_goal_g if protein_goal_g > 0 else 80.0

    sleep_s   = min(sleep_h / sg, 1.0)     * 30
    water_s   = min(water_ml / wg, 1.0)    * 20
    steps_s   = min(steps / stg, 1.0)      * 20
    protein_s = min(protein_g / pg, 1.0)   * 20
    workout_s = 10 if workout_today else 0
    return round(sleep_s + water_s + steps_s + protein_s + workout_s)


# ═══════════════════════════════════════════════════════════════════════
# Activity feed label builder
# ═══════════════════════════════════════════════════════════════════════

_TYPE_META = {
    "meal":     {"label": "Meal logged",       "icon": "Apple",    "color": "#22C55E", "bg": "#F0FDF4"},
    "water":    {"label": "Hydration logged",  "icon": "Droplets", "color": "#06B6D4", "bg": "#ECFEFF"},
    "sleep":    {"label": "Sleep recorded",    "icon": "Moon",     "color": "#F59E0B", "bg": "#FFFBEB"},
    "workout":  {"label": "Workout logged",    "icon": "Dumbbell", "color": "#8B5CF6", "bg": "#F5F3FF"},
    "weight":   {"label": "Weight logged",     "icon": "Scale",    "color": "#FF6B00", "bg": "#FFF7ED"},
    "steps":    {"label": "Steps logged",      "icon": "Footprints","color": "#22C55E", "bg": "#F0FDF4"},
    "medicine": {"label": "Medicine taken",    "icon": "Pill",     "color": "#EF4444", "bg": "#FEF2F2"},
    "mood":     {"label": "Mood logged",       "icon": "Smile",    "color": "#EC4899", "bg": "#FDF2F8"},
    "notes":    {"label": "Note added",        "icon": "FileText", "color": "#6B7280", "bg": "#F9FAFB"},
}

def _format_activity(log: Dict) -> Dict:
    t = log.get("type", "notes")
    meta = _TYPE_META.get(t, _TYPE_META["notes"])
    value = log.get("value", "")

    sub = value
    cal = ""

    if t == "meal":
        note = log.get("note", "")
        meal_name = log.get("meal_name") or ""
        calories  = log.get("calories") or _parse_meal_calories(log)
        protein   = log.get("protein")  or _parse_meal_protein(log)
        if not meal_name and note:
            try:
                d = json.loads(note)
                meal_name = d.get("meal_name", "")
            except Exception:
                pass
        sub = meal_name or value
        if calories:
            cal = f"{int(calories)} kcal"
    elif t == "water":
        sub = f"{int(_parse_water_ml(value))} ml water"
    elif t == "sleep":
        sub = value
    elif t == "workout":
        sub = value
    elif t == "weight":
        sub = f"{value}"
    elif t == "steps":
        sub = f"{int(_parse_steps(value))} steps"

    created_at = log.get("created_at")
    time_str = ""
    if created_at:
        if isinstance(created_at, datetime):
            time_str = created_at.strftime("%I:%M %p").lstrip("0")
        else:
            time_str = str(created_at)

    return {
        "icon": meta["icon"],
        "color": meta["color"],
        "bg": meta["bg"],
        "label": meta["label"],
        "sub": sub,
        "time": time_str,
        "cal": cal,
    }


# ═══════════════════════════════════════════════════════════════════════
# Weekly chart builder
# ═══════════════════════════════════════════════════════════════════════

def _build_weekly_chart(logs: List[Dict]) -> List[Dict]:
    """
    Returns last 7 days, oldest → newest.
    Each entry: { day, Calories, Water, Steps, Protein, Workout, BMI_weight }
    BMI_weight is the weight logged that day (for BMI trend — caller computes BMI).
    """
    days: List[Dict] = []
    for i in range(6, -1, -1):
        dt = _day_start(_utcnow()) - timedelta(days=i)
        day_str = _date_str(dt)
        day_logs = [l for l in logs if _date_str(l["created_at"]) == day_str]

        calories = sum(_parse_meal_calories(l) for l in day_logs if l.get("type") == "meal")
        water    = sum(_parse_water_ml(l.get("value", "")) for l in day_logs if l.get("type") == "water")
        steps    = sum(_parse_steps(l.get("value", "")) for l in day_logs if l.get("type") == "steps")
        protein  = sum(_parse_meal_protein(l) for l in day_logs if l.get("type") == "meal")
        workout  = sum(
            _parse_workout_minutes(l.get("value", ""))
            for l in day_logs if l.get("type") == "workout"
        )
        # Latest weight that day (for BMI chart)
        w_logs = [l for l in day_logs if l.get("type") == "weight"]
        weight_kg = _parse_weight_kg(w_logs[0].get("value", "")) if w_logs else 0.0

        days.append({
            "day": dt.strftime("%a"),
            "Calories": round(calories),
            "Water": round(water),
            "Steps": round(steps),
            "Protein": round(protein),
            "Workout": round(workout),
            "Weight": round(weight_kg, 1),
        })
    return days


# ═══════════════════════════════════════════════════════════════════════
# Achievements builder
# ═══════════════════════════════════════════════════════════════════════

def _build_achievements(
    streak: int,
    steps_today: float, steps_goal: float,
    water_today_ml: float, water_goal_ml_val: float,
    protein_today: float, protein_goal: float,
    workout_count_30d: int,
    total_logs: int,
) -> List[Dict]:
    badges = []

    if streak >= 7:
        badges.append({"emoji": "🔥", "label": f"{streak} Day Streak", "unlocked": True})
    if steps_today >= 10000:
        badges.append({"emoji": "🏆", "label": "10K Steps", "unlocked": True})
    elif steps_today >= steps_goal > 0:
        badges.append({"emoji": "👟", "label": "Steps Goal Hit", "unlocked": True})
    if water_today_ml >= water_goal_ml_val > 0:
        badges.append({"emoji": "💧", "label": "Hydration Master", "unlocked": True})
    if protein_today >= protein_goal > 0:
        badges.append({"emoji": "💪", "label": "Protein Goal Hit", "unlocked": True})
    if workout_count_30d >= 12:
        badges.append({"emoji": "🏋️", "label": "Workout Warrior", "unlocked": True})
    if total_logs >= 50:
        badges.append({"emoji": "📊", "label": "50 Logs Milestone", "unlocked": True})
    if total_logs >= 100:
        badges.append({"emoji": "🌟", "label": "100 Logs Legend", "unlocked": True})

    return badges[:6]


# ═══════════════════════════════════════════════════════════════════════
# Goal completion helper
# ═══════════════════════════════════════════════════════════════════════

def _goal_completion(
    steps: float, steps_goal: float, steps_set: bool,
    water_ml: float, water_goal_ml_val: float, water_set: bool,
    sleep_h: float, sleep_goal_h: float, sleep_set: bool,
    cal: float, cal_goal: float, cal_set: bool,
    protein_g: float, protein_goal_g: float, protein_set: bool,
    body_goal_pct: float, weight_goal_set: bool
) -> Dict:
    """
    Only count goals the user explicitly set in their profile.
    Total possible goals = 6.
    """
    goals = [
        (steps,     steps_goal,         steps_set),
        (water_ml,  water_goal_ml_val,  water_set),
        (sleep_h,   sleep_goal_h,       sleep_set),
        (cal,       cal_goal,           cal_set),
        (protein_g, protein_goal_g,     protein_set),
    ]
    active = [(got, goal) for got, goal, is_set in goals if is_set and goal > 0]
    total  = len(active)
    met    = sum(1 for got, goal in active if got >= goal)

    if weight_goal_set:
        total += 1
        if body_goal_pct >= 100:
            met += 1

    pct    = round((met / total) * 100) if total > 0 else 0
    return {"met": met, "total": total, "pct": pct}


# ═══════════════════════════════════════════════════════════════════════
# Main endpoint  GET /api/dashboard
# ═══════════════════════════════════════════════════════════════════════

@router.get("")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    # ── fetch logs ──────────────────────────────────────────────────
    logs_30d   = await _all_logs(user_id, 30)
    logs_7d    = await _all_logs(user_id, 7)
    today_logs = await _today_logs(user_id)
    first_w    = await _first_weight_log(user_id)
    latest_w   = await _latest_weight_log(user_id)

    # ── profile goals ───────────────────────────────────────────────
    # Track which goals the user explicitly set (non-null, non-zero in profile).
    _raw_cal     = current_user.get("calories_goal")
    _raw_protein = current_user.get("protein_goal")
    _raw_steps   = current_user.get("daily_steps_goal")
    _raw_sleep   = current_user.get("sleep_goal")
    _raw_water   = current_user.get("water_goal")
    _raw_weight  = current_user.get("target_weight")

    cal_goal_set     = _raw_cal     not in (None, "", 0)
    protein_goal_set = _raw_protein not in (None, "", 0)
    steps_goal_set   = _raw_steps   not in (None, "", 0)
    sleep_goal_set   = _raw_sleep   not in (None, "", 0)
    water_goal_set   = _raw_water   not in (None, "", 0)
    weight_goal_set  = _raw_weight  not in (None, "", 0)

    # No fallbacks. Use 0 if not set.
    cal_goal          = _goal_float(_raw_cal)
    protein_goal      = _goal_float(_raw_protein)
    steps_goal        = _goal_float(_raw_steps)
    sleep_goal_h      = _goal_float(_raw_sleep)
    water_goal_ml_val = _water_goal_ml(_raw_water) if water_goal_set else 0.0
    target_weight     = _goal_float(_raw_weight)

    # ── today aggregates ────────────────────────────────────────────
    water_today_ml = sum(
        _parse_water_ml(l.get("value", ""))
        for l in today_logs if l.get("type") == "water"
    )
    cal_today = sum(
        _parse_meal_calories(l)
        for l in today_logs if l.get("type") == "meal"
    )
    protein_today = sum(
        _parse_meal_protein(l)
        for l in today_logs if l.get("type") == "meal"
    )
    steps_today = sum(
        _parse_steps(l.get("value", ""))
        for l in today_logs if l.get("type") == "steps"
    )
    sleep_logs_today = [l for l in today_logs if l.get("type") == "sleep"]
    sleep_today_h = _parse_sleep_hours(sleep_logs_today[0].get("value", "")) if sleep_logs_today else 0.0

    # Most recent sleep (may be yesterday)
    sleep_logs_recent = [l for l in logs_7d if l.get("type") == "sleep"]
    sleep_display_h = _parse_sleep_hours(sleep_logs_recent[0].get("value", "")) if sleep_logs_recent else 0.0

    workout_today = any(l.get("type") == "workout" for l in today_logs)
    workout_min_today = sum(
        _parse_workout_minutes(l.get("value", ""))
        for l in today_logs if l.get("type") == "workout"
    )
    workout_count_30d = sum(1 for l in logs_30d if l.get("type") == "workout")

    # ── streak ──────────────────────────────────────────────────────
    streak = _calc_streak(logs_30d)

    # ── health score ────────────────────────────────────────────────
    # Workout goal assumed 30 min internally if not a profile field, just for scoring.
    health_score = _calc_health_score(
        water_today_ml, water_goal_ml_val,
        sleep_display_h, sleep_goal_h,
        cal_today, cal_goal,
        protein_today, protein_goal,
        steps_today, steps_goal,
        workout_min_today, 30.0,
        streak,
    )

    # ── readiness ───────────────────────────────────────────────────
    readiness_score = _calc_readiness(
        sleep_display_h, sleep_goal_h,
        water_today_ml, water_goal_ml_val,
        steps_today, steps_goal,
        protein_today, protein_goal,
        workout_today,
    )

    # ── BMI ─────────────────────────────────────────────────────────
    height_m = _height_to_meters(current_user.get("height"))
    latest_weight_kg = _parse_weight_kg(latest_w.get("value", "")) if latest_w else None

    bmi_value = None
    bmi_category = None
    if height_m and latest_weight_kg and height_m > 0 and latest_weight_kg > 0:
        bmi_value = round(latest_weight_kg / (height_m ** 2), 1)
        if bmi_value < 18.5:
            bmi_category = "Underweight ⚠️"
        elif bmi_value < 25:
            bmi_category = "Healthy ✅"
        elif bmi_value < 30:
            bmi_category = "Overweight ⚠️"
        else:
            bmi_category = "Obese 🚨"

    # ── body goal tracker ───────────────────────────────────────────
    start_weight_kg  = _parse_weight_kg(first_w.get("value", "")) if first_w else None
    current_weight_kg = latest_weight_kg

    body_goal: Dict = {}
    if start_weight_kg and current_weight_kg and target_weight:
        lost       = round(start_weight_kg - current_weight_kg, 1)
        remaining  = round(current_weight_kg - target_weight, 1)
        total_to_lose = start_weight_kg - target_weight
        complete_pct  = round(max(0, min(100, (lost / total_to_lose) * 100))) if total_to_lose > 0 else 0
        slider_pct    = complete_pct
        body_goal = {
            "start_weight": round(start_weight_kg, 1),
            "current_weight": round(current_weight_kg, 1),
            "goal_weight": round(target_weight, 1),
            "lost": max(lost, 0),
            "remaining": max(remaining, 0),
            "complete_pct": complete_pct,
            "slider_pct": slider_pct,
        }
    elif current_weight_kg:
        body_goal = {
            "start_weight": round(current_weight_kg, 1),
            "current_weight": round(current_weight_kg, 1),
            "goal_weight": round(target_weight, 1) if target_weight else None,
            "lost": 0,
            "remaining": round(current_weight_kg - target_weight, 1) if target_weight else 0,
            "complete_pct": 0,
            "slider_pct": 0,
        }

    # ── goal completion ─────────────────────────────────────────────
    goal_comp = _goal_completion(
        steps_today, steps_goal, steps_goal_set,
        water_today_ml, water_goal_ml_val, water_goal_set,
        sleep_display_h, sleep_goal_h, sleep_goal_set,
        cal_today, cal_goal, cal_goal_set,
        protein_today, protein_goal, protein_goal_set,
        body_goal.get("complete_pct", 0), weight_goal_set
    )

    # ── weekly chart ────────────────────────────────────────────────
    weekly_chart = _build_weekly_chart(logs_7d)

    # Fill BMI values in chart using profile height
    if height_m and height_m > 0:
        for row in weekly_chart:
            w = row.get("Weight", 0)
            row["BMI"] = round(w / (height_m ** 2), 1) if w > 0 else 0
    else:
        for row in weekly_chart:
            row["BMI"] = 0

    # ── recent activity ─────────────────────────────────────────────
    recent_activity = [_format_activity(l) for l in logs_7d[:8]]

    # ── metric cards (today's 4 key metrics) ───────────────────────
    cal_pct      = min(round((cal_today / cal_goal) * 100), 100) if cal_goal > 0 else 0
    water_pct    = min(round((water_today_ml / water_goal_ml_val) * 100), 100) if water_goal_ml_val > 0 else 0
    steps_pct    = min(round((steps_today / steps_goal) * 100), 100) if steps_goal > 0 else 0
    sleep_pct    = min(round((sleep_display_h / sleep_goal_h) * 100), 100) if sleep_goal_h > 0 else 0

    # ── today's progress bars ──────────────────────────────────────
    protein_pct  = min(round((protein_today / protein_goal) * 100), 100) if protein_goal > 0 else 0
    workout_pct  = min(round((workout_min_today / 60) * 100), 100)

    # ── achievements ────────────────────────────────────────────────
    achievements = _build_achievements(
        streak, steps_today, steps_goal,
        water_today_ml, water_goal_ml_val,
        protein_today, protein_goal,
        workout_count_30d,
        len(logs_30d),
    )

    # ── profile completion % ────────────────────────────────────────
    required_fields = ["full_name", "email", "mobile", "age", "height", "weight",
                       "blood_group", "gender", "target_weight", "daily_steps_goal",
                       "water_goal", "sleep_goal", "calories_goal", "protein_goal"]
    filled = sum(1 for f in required_fields if current_user.get(f) not in (None, "", 0))
    profile_pct = round((filled / len(required_fields)) * 100)

    # ── greeting ────────────────────────────────────────────────────
    hour = _utcnow().hour
    if hour < 12:
        greeting_word = "Good morning"
    elif hour < 17:
        greeting_word = "Good afternoon"
    else:
        greeting_word = "Good evening"

    full_name = current_user.get("full_name", "").split()[0] if current_user.get("full_name") else "there"

    # ── assemble response ───────────────────────────────────────────
    return {
        # identity
        "greeting": greeting_word,
        "first_name": full_name,
        "profile_pct": profile_pct,

        # top cards
        "health_score": health_score,
        "streak": streak,
        "readiness_score": readiness_score,
        "goal_completion": goal_comp,   # {met, total, pct}

        # metric cards row — goal=0 when user has not set that goal
        "metrics": {
            "calories":  {"value": round(cal_today),                   "goal": round(cal_goal)            if cal_goal_set   else 0,   "pct": cal_pct   if cal_goal_set   else 0, "unit": "kcal"},
            "water":     {"value": round(water_today_ml / 1000, 1),    "goal": round(water_goal_ml_val / 1000, 1) if water_goal_set else 0, "pct": water_pct if water_goal_set else 0, "unit": "L"},
            "steps":     {"value": round(steps_today),                 "goal": round(steps_goal)          if steps_goal_set else 0,   "pct": steps_pct if steps_goal_set else 0, "unit": "steps"},
            "sleep":     {"value": round(sleep_display_h, 1),          "goal": round(sleep_goal_h, 1)     if sleep_goal_set else 0,   "pct": sleep_pct if sleep_goal_set else 0, "unit": "hrs"},
        },

        # today's progress bars — max=0 when goal not set so frontend hides "/ 0 unit"
        "today_progress": [
            {"label": "Steps",      "value": round(steps_today),      "max": round(steps_goal)       if steps_goal_set   else 0, "unit": "",   "pct": steps_pct,   "color": "#22C55E"},
            {"label": "Protein",    "value": round(protein_today),    "max": round(protein_goal)     if protein_goal_set else 0, "unit": "g",  "pct": protein_pct, "color": "#8B5CF6"},
            {"label": "Water",      "value": round(water_today_ml),   "max": round(water_goal_ml_val)if water_goal_set   else 0, "unit": "ml", "pct": water_pct,   "color": "#06B6D4"},
            {"label": "Active Min", "value": round(workout_min_today),"max": 60,                                                  "unit": "m",  "pct": workout_pct, "color": "#FF6B00"},
        ],

        # BMI
        "bmi": {
            "value": bmi_value,
            "category": bmi_category,
            "weight_kg": round(latest_weight_kg, 1) if latest_weight_kg else None,
            "height_m": round(height_m, 3) if height_m else None,
        },

        # body goal tracker
        "body_goal": body_goal,

        # weekly chart (7 days)
        "weekly_chart": weekly_chart,

        # recent activity feed
        "recent_activity": recent_activity,

        # mini stats for activity card bottom
        "activity_stats": {
            "logged_today": len(today_logs),
            "calories_out": round(
                sum(_parse_workout_minutes(l.get("value","")) * 7
                    for l in today_logs if l.get("type") == "workout")
            ),
            "active_min": round(workout_min_today),
        },

        # achievements
        "achievements": achievements,
    }