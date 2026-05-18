"""
backend/routes/ai.py — VitaTrack AI Coach v2
──────────────────────────────────────────────────────────────────────────────

AI SYSTEM 1: Floating Assistant (/api/ai/assistant)
  → Groq + Llama-3.3-70B, general health Q&A, NO user data. UNCHANGED.

AI SYSTEM 2: AI Coach (/api/ai/chat)
  → Groq + Llama-3.3-70B, uses real MongoDB data, full context injection.

FIXES in v2:
  1. Groq LLM replaces all if/else keyword matching for /chat
  2. Full conversation history sent to Groq — real multi-turn memory
  3. Production-grade intent detection (greeting, unclear, energy, sleep,
     protein, hydration, workout, nutrition, stress, progress, symptom)
  4. Anti-repeat: last 5 turns summarised and injected so Groq never repeats
  5. Persistent user preferences (diet_type, allergies, fitness_level)
     stored in users collection, injected into every prompt
  6. Diet-aware: vegetarian/vegan → never suggests meat/chicken/fish
  7. Exact numbers always in context: water_ml, protein_g, sleep_h, etc.
  8. Response structure enforced in system prompt:
       ANALYSIS → PROBLEM DETECTION → ACTION PLAN → MOTIVATION
  9. Symptom safety: serious symptoms redirect to healthcare professional
 10. FIXED: user_id now wrapped in ObjectId() for all DB queries
 11. FIXED: today window uses 32-hour lookback (timezone-safe)
 12. FIXED: profile goals used instead of hardcoded constants
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Dict, List, Optional
import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel as _BaseModel

from core.deps import get_current_user
from database import get_database
from schemas.ai import (
    ChatRequest, ChatResponse,
    ChatMessage,
    MarkDoneRequest,
    Suggestion, SuggestionsResponse,
    HealthSummary,
)

router = APIRouter(prefix="/api/ai", tags=["VitaAI Coach"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"


# ═══════════════════════════════════════════════════════════════════════
# Value parsers  (identical to working dashboard parsers)
# ═══════════════════════════════════════════════════════════════════════

def _first_num(text: str) -> float:
    m = re.search(r"\d+\.?\d*", str(text or ""))
    return float(m.group()) if m else 0.0


def _parse_water_ml(value: str) -> float:
    v = str(value or "").strip().lower()
    num = _first_num(v)
    if num and ("l" in v or "liter" in v) and "ml" not in v:
        num *= 1000
    return num


def _parse_sleep_h(value: str) -> float:
    v = str(value or "").strip().lower()
    hm = re.search(r"(\d+)\s*h(?:ours?)?\s*(?:(\d+)\s*m)?", v)
    if hm:
        return round(float(hm.group(1)) + float(hm.group(2) or 0) / 60, 2)
    num = _first_num(v)
    return round(num / 60, 2) if num > 24 else num


def _parse_weight_kg(value: str) -> float:
    return _first_num(value)


def _parse_meal_cal(log: Dict) -> float:
    if log.get("calories") is not None:
        try: return float(log["calories"])
        except: pass
    note = log.get("note") or ""
    if str(note).strip().startswith("{"):
        try:
            c = json.loads(note).get("calories")
            if c is not None: return float(c)
        except: pass
    m = re.search(r"(\d+\.?\d*)\s*kcal", str(log.get("value", "")), re.I)
    return float(m.group(1)) if m else 0.0


def _parse_meal_protein(log: Dict) -> float:
    if log.get("protein") is not None:
        try: return float(log["protein"])
        except: pass
    note = log.get("note") or ""
    if str(note).strip().startswith("{"):
        try:
            p = json.loads(note).get("protein")
            if p is not None: return float(p)
        except: pass
    m = re.search(r"(\d+\.?\d*)\s*g\s*protein", str(log.get("value", "")), re.I)
    return float(m.group(1)) if m else 0.0


def _parse_workout_min(value: str) -> float:
    m = re.search(r"(\d+)\s*min", str(value or ""), re.I)
    return float(m.group(1)) if m else _first_num(value)


MOOD_MAP = {
    "terrible":1,"awful":1,"horrible":1,"bad":3,"poor":3,"sad":3,"unhappy":3,
    "okay":5,"ok":5,"fine":5,"neutral":5,"alright":5,"good":7,"happy":7,
    "positive":7,"great":8,"excellent":9,"amazing":10,"fantastic":10,"wonderful":10,
}

def _parse_mood_score(value: str) -> int:
    v = str(value or "").strip().lower()
    clean = re.sub(r"[^\w\s]", "", v).strip()
    for word in clean.split():
        if word in MOOD_MAP:
            return MOOD_MAP[word] * 10
    num = _first_num(v)
    if num > 0:
        return int(num * 10) if num <= 10 else int(num)
    return 50


# ═══════════════════════════════════════════════════════════════════════
# Goal parsers
# ═══════════════════════════════════════════════════════════════════════

def _goal_num(raw) -> float:
    if raw is None: return 0.0
    v = str(raw).lower()
    for u in ["kcal"," g","liter","litre","ml","hrs","hr","h","steps","kg","lbs","l"]:
        v = v.replace(u, "")
    try: return float(v.strip())
    except: return 0.0


def _water_goal_ml(raw) -> float:
    if raw is None: return 2000.0
    v = str(raw).strip().lower()
    num = _first_num(v)
    if num == 0: return 2000.0
    if "ml" in v: return num
    return num * 1000 if num < 30 else num


# ═══════════════════════════════════════════════════════════════════════
# Time helpers
# ═══════════════════════════════════════════════════════════════════════

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ═══════════════════════════════════════════════════════════════════════
# DB helpers — FIXED: all use ObjectId(user_id) + 32h today window
# ═══════════════════════════════════════════════════════════════════════

async def _fetch_today_logs(user_id: str) -> List[Dict]:
    """FIX: 32h lookback = timezone-safe for all users worldwide."""
    db = get_database()
    cutoff = _utcnow() - timedelta(hours=32)
    cur = db["logs"].find(
        {"user_id": ObjectId(user_id), "created_at": {"$gte": cutoff}},
        sort=[("created_at", -1)],
    )
    return await cur.to_list(length=300)


async def _fetch_logs_days(user_id: str, days: int) -> List[Dict]:
    """FIX: ObjectId wrapping + 2d buffer."""
    db = get_database()
    cutoff = _utcnow() - timedelta(days=days + 2)
    cur = db["logs"].find(
        {"user_id": ObjectId(user_id), "created_at": {"$gte": cutoff}},
        sort=[("created_at", -1)],
    )
    return await cur.to_list(length=1000)


async def _fetch_reminders(user_id: str) -> List[Dict]:
    db = get_database()
    cur = db["reminders"].find({"user_id": user_id})
    return await cur.to_list(length=200)


async def _fetch_suggestion_states(user_id: str, date_str: str) -> Dict[str, bool]:
    db = get_database()
    doc = await db["ai_suggestion_states"].find_one(
        {"user_id": user_id, "date": date_str}
    )
    return doc.get("states", {}) if doc else {}


# ── User preferences (diet_type, fitness_level, allergies) ─────────────

async def _get_user_preferences(user_id: str) -> Dict:
    db = get_database()
    doc = await db["users"].find_one({"_id": ObjectId(user_id)}, {"preferences": 1})
    prefs = doc.get("preferences") if doc else None
    if not prefs:
        prefs = {}
    if "diet_type" not in prefs:
        prefs["diet_type"] = "vegetarian"
    return prefs


async def _save_user_preference(user_id: str, key: str, value: str):
    db = get_database()
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {f"preferences.{key}": value}},
        upsert=False,
    )


# ═══════════════════════════════════════════════════════════════════════
# Context loader — builds the full health picture from real logs
# ═══════════════════════════════════════════════════════════════════════

def _clamp(v: int, lo=0, hi=100) -> int:
    return max(lo, min(hi, v))


async def _load_health_context(user_id: str, current_user: dict) -> Dict:
    import asyncio
    today_logs, logs_7d, logs_30d = await asyncio.gather(
        _fetch_today_logs(user_id),
        _fetch_logs_days(user_id, 7),
        _fetch_logs_days(user_id, 30)
    )

    # Profile goals
    cal_goal      = _goal_num(current_user.get("calories_goal"))    or 2200.0
    protein_goal  = _goal_num(current_user.get("protein_goal"))     or 100.0
    steps_goal    = _goal_num(current_user.get("daily_steps_goal")) or 10000.0
    sleep_goal_h  = _goal_num(current_user.get("sleep_goal"))       or 8.0
    water_goal_ml = _water_goal_ml(current_user.get("water_goal"))
    target_weight = _goal_num(current_user.get("target_weight"))

    # Today aggregates
    water_ml   = sum(_parse_water_ml(l.get("value",""))    for l in today_logs if l.get("type")=="water")
    cal        = sum(_parse_meal_cal(l)                    for l in today_logs if l.get("type")=="meal")
    protein_g  = sum(_parse_meal_protein(l)                for l in today_logs if l.get("type")=="meal")
    steps      = sum(_first_num(l.get("value",""))         for l in today_logs if l.get("type")=="steps")
    workout_min= sum(_parse_workout_min(l.get("value","")) for l in today_logs if l.get("type")=="workout")

    # Sleep (today else most recent 7d)
    sleep_today = [l for l in today_logs if l.get("type")=="sleep"]
    sleep_7d    = [l for l in logs_7d    if l.get("type")=="sleep"]
    sleep_h = _parse_sleep_h(sleep_today[0].get("value","")) if sleep_today \
              else (_parse_sleep_h(sleep_7d[0].get("value","")) if sleep_7d else 0.0)

    # Mood
    mood_logs = [l for l in logs_7d if l.get("type")=="mood"]
    mood_val  = mood_logs[0].get("value","") if mood_logs else "unknown"
    mood_score= _clamp(_parse_mood_score(mood_val)) if mood_val != "unknown" else 70

    # Workout recency
    w_logs = [l for l in logs_7d if l.get("type")=="workout"]
    days_since_workout = 7
    if w_logs:
        last = w_logs[0].get("created_at", _utcnow())
        days_since_workout = (_utcnow() - last).days if isinstance(last, datetime) else 7

    # Weight trend (30d)
    wt_logs = sorted([l for l in logs_30d if l.get("type")=="weight"],
                     key=lambda l: l.get("created_at", datetime.min))
    weights = [_parse_weight_kg(l.get("value","")) for l in wt_logs]
    weights = [w for w in weights if w > 0]
    weight_trend = "stable"
    if len(weights) >= 2:
        d = weights[-1] - weights[0]
        weight_trend = "increasing" if d > 0.5 else ("decreasing" if d < -0.5 else "stable")
    latest_weight = weights[-1] if weights else None

    # 7-day averages
    def _daily_avg(logs, typ, parser):
        days_with = {}
        for l in logs:
            if l.get("type") == typ:
                d = l.get("created_at")
                k = d.strftime("%Y-%m-%d") if isinstance(d, datetime) else "?"
                days_with[k] = days_with.get(k, 0) + parser(l) if typ=="meal" else days_with.get(k, 0) + _first_num(l.get("value",""))
        return sum(days_with.values()) / len(days_with) if days_with else 0

    avg_water_7d   = _daily_avg(logs_7d, "water",   lambda l: _parse_water_ml(l.get("value","")))
    avg_cal_7d     = _daily_avg(logs_7d, "meal",    _parse_meal_cal)
    avg_protein_7d = _daily_avg(logs_7d, "meal",    _parse_meal_protein)

    # Scores
    def pct(got, goal): return _clamp(int((got/goal)*100)) if goal > 0 else 0
    water_score   = pct(water_ml,   water_goal_ml)
    sleep_score   = pct(sleep_h,    sleep_goal_h)
    protein_score = pct(protein_g,  protein_goal)
    cal_score     = pct(cal,        cal_goal)
    steps_score   = pct(steps,      steps_goal)
    workout_score = _clamp(int((min(len(w_logs), 4) / 4) * 100))
    overall_score = _clamp(int((water_score+sleep_score+protein_score+workout_score+mood_score)/5))

    return dict(
        # today
        water_ml=water_ml,     water_goal_ml=water_goal_ml,   water_score=water_score,
        cal=cal,               cal_goal=cal_goal,             cal_score=cal_score,
        protein_g=protein_g,   protein_goal=protein_goal,     protein_score=protein_score,
        steps=steps,           steps_goal=steps_goal,         steps_score=steps_score,
        sleep_h=sleep_h,       sleep_goal_h=sleep_goal_h,     sleep_score=sleep_score,
        workout_min=workout_min,
        # recency / trend
        days_since_workout=days_since_workout,
        workout_score=workout_score,
        mood_val=mood_val,     mood_score=mood_score,
        weight_trend=weight_trend,
        latest_weight=latest_weight,
        target_weight=target_weight,
        # 7d averages
        avg_water_7d=avg_water_7d,
        avg_cal_7d=avg_cal_7d,
        avg_protein_7d=avg_protein_7d,
        # overall
        overall_score=overall_score,
        # log counts
        today_log_count=len(today_logs),
        logs_7d_count=len(logs_7d),
    )


# ═══════════════════════════════════════════════════════════════════════
# Intent detector — classifies user message BEFORE sending to Groq
# Returns one of the supported intent strings.
# ═══════════════════════════════════════════════════════════════════════

# Serious symptoms that require medical referral (never diagnose)
_SERIOUS_SYMPTOMS = [
    "chest pain", "difficulty breathing", "breathless", "heart attack",
    "stroke", "unconscious", "seizure", "coughing blood", "suicide",
    "self harm", "overdose",
]

# Keyword sets per intent — order matters (most specific first)
_INTENT_RULES: List[tuple[str, List[str]]] = [
    ("greeting",   ["hi", "hello", "hey", "good morning", "good afternoon",
                    "good evening", "what's up", "sup", "howdy"]),
    # "good", "great", "weak" intentionally removed — context-dependent words
    # that caused false positives. "weak" belongs to energy/symptom.
    ("unclear",    ["ok", "okay", "hmm", "nice", "cool",
                    "thanks", "thank you", "thx", "lol", "haha", "k", "alright",
                    "fine", "sure", "yep", "nope", "yeah", "no", "yes", "abc",
                    "good", "great", "good!", "great!", "👍"]),
    ("symptom",    ["headache", "dizzy", "dizziness", "cramp", "cramps",
                    "pain", "ache", "weak", "weakness", "nausea", "fever",
                    "vomit", "sore", "hurt", "ill", "sick", "fatigue", "bloat"]),
    ("energy",     ["energy", "tired", "exhausted", "sluggish", "no stamina",
                    "boost energy", "low energy", "weak", "lethargy", "lethargic"]),
    ("sleep",      ["sleep", "insomnia", "can't sleep", "waking up", "poor sleep",
                    "improve sleep", "sleeping", "bedtime", "nap", "rest"]),
    ("hydration",  ["water", "hydration", "hydrate", "dehydrated", "thirst",
                    "drink", "fluids"]),
    ("protein",    ["protein", "muscle", "build muscle", "gain muscle",
                    "protein foods", "protein plan", "amino"]),
    ("workout",    ["workout", "exercise", "gym", "training", "chest",
                    "leg day", "push day", "pull day", "strength", "cardio",
                    "fat loss", "muscle gain", "hiit", "weights", "run",
                    "running", "jog", "cycling", "bicep", "tricep"]),
    ("nutrition",  ["diet", "meal", "food", "breakfast", "lunch", "dinner",
                    "snack", "calories", "calorie", "kcal", "nutrition",
                    "meal plan", "fruits", "vegetables", "carbs", "fats"]),
    ("stress",     ["stress", "stressed", "anxiety", "anxious", "burnout",
                    "mental", "overwhelmed", "worried", "mood", "emotional",
                    "depressed", "sad", "upset"]),
    ("progress",   ["how am i", "progress", "show progress", "am i improving",
                    "overall", "summary", "status", "this week", "weekly",
                    "my stats", "how is my", "how have i"]),
    ("weight",     ["weight", "fat loss", "lose weight", "lose fat", "bmi",
                    "body fat", "slim", "bulk", "cutting", "bulking"]),
    # Preference: use precise multi-word phrases only — avoids bare "vegetarian"
    # matching "I'm NOT vegetarian". Bare nouns handled by _extract_and_save_preferences.
    ("preference", ["i am vegetarian", "i'm vegetarian", "i am a vegetarian",
                    "i am vegan", "i'm vegan", "i am a vegan",
                    "no meat", "no fish", "no chicken",
                    "i don't eat meat", "i don't eat chicken", "i don't eat fish",
                    "gluten free", "gluten-free", "lactose intolerant",
                    "my diet is", "i follow a vegetarian", "i follow a vegan"]),
]

# Negation words — if one of these immediately precedes a diet keyword the
# message is still routed to "preference" so the backend can handle it
# correctly (it reads the full raw message, not just the intent label).
_NEGATION_WORDS = {"not", "never", "don't", "do not", "isn't", "no longer", "stopped"}


def _get_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _detect_intent(msg: str, has_history: bool = False) -> str:
    lower = msg.lower().strip()

    # ── 1. Serious symptoms — always highest priority ─────────────────────────
    if any(s in lower for s in _SERIOUS_SYMPTOMS):
        return "symptom_serious"

    # ── 2. Very short messages (≤ 3 words) — match greeting/unclear exactly ───
    words = lower.split()
    if len(words) <= 3:
        for intent, keywords in _INTENT_RULES[:2]:   # greeting + unclear only
            if any(lower == k or lower == k + "!" or lower == k + "." for k in keywords):
                return intent

    # ── 3. Preference — check with negation awareness ─────────────────────────
    #    We still return "preference" even when negated — the backend handler
    #    reads the raw message and knows how to process "I'm NOT vegetarian".
    pref_keywords = _INTENT_RULES[-1][1]
    if any(k in lower for k in pref_keywords):
        return "preference"

    # ── 4. Full keyword scan for all remaining intents ────────────────────────
    for intent, keywords in _INTENT_RULES[:-1]:  # skip preference (handled above)
        if any(k in lower for k in keywords):
            # "unclear" mid-conversation = user is acknowledging a coaching reply.
            # Route to "continuation" so Groq knows to advance the coaching arc,
            # not interrogate the user with a topic-selection menu.
            if intent == "unclear" and has_history:
                return "continuation"
            return intent

    return "general"


# ═══════════════════════════════════════════════════════════════════════
# Diet-aware ingredient lists
# ═══════════════════════════════════════════════════════════════════════

_VEGETARIAN_PROTEIN = [
    "paneer", "tofu", "dal", "lentils", "chickpeas", "rajma", "soy",
    "Greek yogurt", "curd", "milk", "cottage cheese", "nuts", "seeds",
    "edamame", "tempeh", "quinoa", "moong dal",
]
_VEGAN_PROTEIN = [
    "tofu", "dal", "lentils", "chickpeas", "rajma", "soy milk", "edamame",
    "tempeh", "quinoa", "pumpkin seeds", "hemp seeds", "moong dal",
    "peanut butter", "almonds", "walnuts",
]
_OMNIVORE_PROTEIN = [
    "chicken breast", "eggs", "Greek yogurt", "paneer", "tofu", "dal",
    "lentils", "fish", "tuna", "salmon", "whey protein",
]


def _protein_sources(diet_type: str) -> List[str]:
    d = (diet_type or "").lower()
    if "vegan" in d:
        return _VEGAN_PROTEIN
    if "vegetarian" in d or "veg" in d:
        return _VEGETARIAN_PROTEIN
    return _OMNIVORE_PROTEIN


# ═══════════════════════════════════════════════════════════════════════
# System prompt builder — injects ALL context into Groq
# ═══════════════════════════════════════════════════════════════════════

def _build_system_prompt(
    ctx: Dict,
    user_name: str,
    intent: str,
    prefs: Dict,
    history_summary: str,
    is_repeat: bool = False,
) -> str:
    diet_type    = prefs.get("diet_type", "not specified")
    allergies    = prefs.get("allergies", "none")
    fitness_level= prefs.get("fitness_level", "not specified")
    protein_srcs = ", ".join(_protein_sources(diet_type)[:6])

    # Diet constraint block
    if "vegan" in diet_type.lower():
        diet_block = (
            "CRITICAL — USER IS VEGAN. Never recommend meat, chicken, fish, eggs, or dairy. "
            "You are strictly forbidden from recommending any animal products. "
            f"Only recommend approved vegan protein sources: {protein_srcs}."
        )
    elif "vegetarian" in diet_type.lower() or diet_type.lower() == "vegetarian":
        diet_block = (
            "CRITICAL — USER IS VEGETARIAN. Under no circumstances should you recommend meat, chicken, fish, beef, pork, or seafood. "
            "Suggesting meat or fish is a critical failure that violates the core diet constraints. "
            f"You are strictly restricted to recommending vegetarian protein sources: {protein_srcs}."
        )
    else:
        diet_block = f"Diet type: {diet_type}. Protein sources: {protein_srcs}."

    # Build dynamic snapshot based on intent to enforce "Analyze ONLY" rules (BUG 2 compliance)
    snapshot_lines = []
    show_all = (intent in ("progress", "general", "continuation"))

    if show_all or intent in ("energy", "hydration"):
        snapshot_lines.append(f"  Water:    {ctx['water_ml']:.0f} ml / {ctx['water_goal_ml']:.0f} ml goal  ({ctx['water_score']}%)")
    if show_all or intent in ("energy", "nutrition", "weight"):
        snapshot_lines.append(f"  Calories: {ctx['cal']:.0f} kcal / {ctx['cal_goal']:.0f} kcal goal  ({ctx['cal_score']}%)")
    if show_all or intent in ("energy", "protein", "nutrition"):
        snapshot_lines.append(f"  Protein:  {ctx['protein_g']:.0f}g / {ctx['protein_goal']:.0f}g goal  ({ctx['protein_score']}%)")
    if show_all or intent in ("workout"):
        snapshot_lines.append(f"  Steps:    {ctx['steps']:.0f} / {ctx['steps_goal']:.0f} goal  ({ctx['steps_score']}%)")
    if show_all or intent in ("energy", "sleep", "workout", "stress"):
        snapshot_lines.append(f"  Sleep:    {ctx['sleep_h']:.1f}h / {ctx['sleep_goal_h']:.1f}h goal  ({ctx['sleep_score']}%)")
    if show_all or intent in ("energy", "workout", "stress", "weight"):
        snapshot_lines.append(f"  Workout:  {ctx['workout_min']:.0f} min today  (last session: {ctx['days_since_workout']}d ago)")
    if show_all or intent in ("energy", "stress"):
        snapshot_lines.append(f"  Mood:     {ctx['mood_val']}  (score: {ctx['mood_score']}/100)")
    if show_all or intent in ("weight"):
        snapshot_lines.append(f"  Weight trend (30d): {ctx['weight_trend']}")
        if ctx.get('latest_weight') is not None:
            snapshot_lines.append(f"  Latest weight: {ctx['latest_weight']} kg   Target weight: {ctx['target_weight']} kg")

    snapshot_lines.append(f"  Overall health score: {ctx['overall_score']}/100")
    snapshot_str = "\n".join(snapshot_lines)

    # 7-day averages (only show if applicable)
    avg_lines = []
    if show_all or intent in ("hydration"):
        avg_lines.append(f"  Avg water:   {ctx['avg_water_7d']:.0f} ml/day")
    if show_all or intent in ("nutrition"):
        avg_lines.append(f"  Avg calories:{ctx['avg_cal_7d']:.0f} kcal/day")
    if show_all or intent in ("protein", "nutrition"):
        avg_lines.append(f"  Avg protein: {ctx['avg_protein_7d']:.0f}g/day")

    if avg_lines:
        avg_str = "\n7-DAY AVERAGES:\n" + "\n".join(avg_lines)
    else:
        avg_str = ""

    snapshot = f"""
TODAY'S HEALTH SNAPSHOT for {user_name}:
{snapshot_str}
{avg_str}
"""

    conversation_block = (
        f"\nPREVIOUS CONVERSATION SUMMARY:\n{history_summary}\n"
        if history_summary
        else ""
    )

    repeat_block = ""
    if is_repeat:
        repeat_block = f"""
CRITICAL URGENT DIRECTIVE — ANTI-REPEAT OVERRIDE:
The user is repeating a highly similar question or statement they recently sent. 
Do NOT repeat the same advice, numbers, recommendations, or structure you gave in the previous turns.
Instead, you must:
1. Explicitly mention what has changed in their logs since the last turn (better / worse / same).
2. Acknowledge their consistency or identify what still needs work based on today's logs vs prior trends.
3. Advance the conversation by proposing a completely NEW action plan (a next logical step) that builds on top of what you already discussed, rather than starting over.
4. Frame your response naturally starting with something like: "Since we just talked about that, let's check what changed..."
"""

    intent_focus = {
        "greeting":      "Reply warmly. Do NOT analyze health data. Just greet by name and ask what they need help with today.",
        "unclear":       "Message is vague with no conversation history. Ask ONE friendly clarification question — offer 3-4 topics as options (e.g. sleep, diet, hydration, workout, energy, progress). Do NOT dump health metrics.",
        "continuation":  "User is acknowledging your previous reply ('ok', 'thanks', 'cool', etc.). "
                         "Do NOT re-start from scratch. Do NOT ask a clarification menu. "
                         "Briefly acknowledge their response, then continue the coaching arc: "
                         "mention one specific next action they can take right now based on what you already discussed.",
        "energy":        "Focus ONLY on: sleep hours vs goal, water ml vs goal, calories vs goal, protein vs goal, workout recency. Identify the biggest energy drain by exact numbers.",
        "sleep":         "Focus ONLY on: sleep hours vs sleep goal, 7-day sleep trend, sleep hygiene gaps. Use exact numbers.",
        "hydration":     "Focus ONLY on: water ml logged vs water goal. Give the exact deficit and a time-bound plan to close it.",
        "protein":       "Focus ONLY on: protein_g logged vs protein_goal, 7-day avg protein. Suggest protein sources that match the user's diet type.",
        "workout":       "Focus ONLY on: workout minutes today, days_since_workout, 7-day workout trend. Give a specific next-session recommendation.",
        "nutrition":     "Focus ONLY on: calories vs goal, protein vs goal, meal quality. All suggestions must respect the user's diet type.",
        "stress":        "Empathise FIRST (1 sentence). Then focus on: mood score, sleep, workout for recovery. Do NOT immediately jump to analysis.",
        "progress":      "Give a COMPLETE progress report covering ALL metrics: water, calories, protein, steps, sleep, workout, mood, weight trend, overall score. Use the 4-section structure.",
        "weight":        "Focus ONLY on: weight trend (30d), latest_weight vs target_weight, calorie balance, workout frequency.",
        "preference":    "Acknowledge the user's dietary preference warmly. Confirm exactly what you've noted (e.g. 'Got it — I've saved that you're vegetarian'). Briefly explain how this will affect your future recommendations. Do NOT do a health analysis.",
        "symptom":       "Acknowledge the symptom empathetically. Give general wellness tips (rest, hydration, light food). Recommend consulting a doctor for anything persistent. Never diagnose.",
        "symptom_serious": "STOP. This may be a medical emergency. Tell the user IMMEDIATELY and directly to seek medical help or call emergency services. Do not give coaching advice. Do not diagnose.",
        "general":       "Give a helpful, personalised health coaching response based on the snapshot data.",
    }.get(intent, "Give a helpful, personalised health coaching response based on the snapshot data.")

    if repeat_block:
        intent_focus = f"{repeat_block}\n{intent_focus}"

    return f"""You are VitaAI Coach, a world-class personal health coach inside VitaTrack.
You are coaching {user_name} right now.

{diet_block}
Allergies: {allergies}
Fitness level: {fitness_level}

{snapshot}
{conversation_block}
CURRENT INTENT: {intent}
FOCUS FOR THIS REPLY: {intent_focus}

MANDATORY RESPONSE RULES — violating any of these is a failure:

1. EXACT NUMBERS ALWAYS. Every health claim must use real numbers from the snapshot.
   ✓ "You've had 400ml / 2500ml today — 2100ml remaining."
   ✗ "You need to drink more water."

2. FOUR-SECTION STRUCTURE (for all intents EXCEPT greeting / unclear / continuation / preference / symptom_serious):
   📊 **ANALYSIS** — cite exact numbers for the metrics relevant to this intent
   ⚠️ **PROBLEM** — identify the specific gap, deficit, or negative trend with numbers
   ✅ **ACTION PLAN** — exactly 2-4 time-bound, actionable steps for the NEXT 2 HOURS
   💪 **MOTIVATION** — exactly 1 sentence, personalised to {user_name}'s data, never generic

3. ANTI-REPEAT (critical). The PREVIOUS CONVERSATION SUMMARY above lists every number
   and action already given. Do NOT repeat them. Instead:
   • Acknowledge what changed since last time (better / worse / same)
   • State what still needs work with fresh framing
   • Produce a new action plan that advances the coaching arc

4. BANNED PHRASES — never use these or close paraphrases:
   "You got this", "Small changes matter", "Every step counts",
   "Keep it up", "Great job", "Stay consistent", "You're doing great",
   "Remember to", "Don't forget to", "It's important to", "Remember that",
   "It is crucial to", "Don't hesitate to", "Let's focus on", "Make sure to",
   "Take a moment to"

5. DIET COMPLIANCE. {diet_block}
   Any food recommendation that violates the diet type above is a critical error.

6. RESPONSE LENGTH:
   • greeting / unclear / continuation / preference → under 60 words
   • symptom / symptom_serious → under 80 words
   • energy / sleep / hydration / protein / workout / nutrition / stress / weight → under 180 words
   • progress → up to 350 words (full report needed)

7. FORMAT: Use markdown bold and bullet points for the four-section structure.
   Use emojis ONLY for section headers (📊 ⚠️ ✅ 💪). No emoji spam.

8. VOICE: You are a direct, knowledgeable human coach. Never sound like a chatbot,
   a FAQ page, or a generic health article. Be personal, be specific, be actionable.
"""


# ═══════════════════════════════════════════════════════════════════════
# History summariser — prevents verbatim repetition
# ═══════════════════════════════════════════════════════════════════════

def _summarise_history(history: List[ChatMessage]) -> str:
    """
    Build an anti-repeat contract from the last 6 conversation turns.

    Instead of echoing raw chat lines (which Groq ignores), we extract:
      • Every specific number already mentioned (ml, g, hours, steps, kcal)
      • Every explicit action already recommended
      • The topic/intent of each coach reply

    Groq receives this as a hard constraint — "you already said X, don't
    repeat it; build on it instead."
    """
    if not history:
        return ""

    recent = history[-12:]  # last 6 pairs max

    # Separate user topics and coach advice blocks
    user_topics: List[str] = []
    coach_advice: List[str] = []

    # Patterns that indicate specific advice or numbers in coach replies
    _num_re   = re.compile(r"\d+(?:\.\d+)?\s*(?:ml|g|kcal|h|min|steps|kg|%)", re.I)
    _act_re   = re.compile(
        r"(?:drink|eat|sleep|walk|run|take|do|try|add|reduce|avoid|log|rest|stretch"
        r"|consume|increase|decrease|aim for|start|stop|focus)[^\n.!?]{5,60}",
        re.I,
    )

    for m in recent:
        if m.role == "user":
            # Keep user topics short — just first 60 chars
            snippet = m.content[:60].replace("\n", " ").strip()
            if snippet:
                user_topics.append(snippet)
        else:
            # Extract numbers already cited
            nums = _num_re.findall(m.content)
            # Extract action phrases already given
            acts = _act_re.findall(m.content)
            # Keep first 90 chars as topic summary
            topic = m.content[:90].replace("\n", " ").strip()

            block_parts = [f"Topic: {topic}"]
            if nums:
                block_parts.append("Numbers cited: " + ", ".join(nums[:8]))
            if acts:
                block_parts.append("Actions given: " + "; ".join(a.strip() for a in acts[:4]))
            coach_advice.append("\n  ".join(block_parts))

    lines: List[str] = []
    if user_topics:
        lines.append("User asked about: " + " | ".join(user_topics))
    if coach_advice:
        lines.append("Coach already covered:")
        for i, advice in enumerate(coach_advice, 1):
            lines.append(f"  [{i}] {advice}")
    lines.append(
        "ANTI-REPEAT RULE: Do NOT re-state any number, action, or recommendation "
        "already listed above. Instead, acknowledge what changed, what improved, "
        "what still needs work, and provide a fresh action plan."
    )
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════
# Preference extractor — detects and saves diet preferences inline
# ═══════════════════════════════════════════════════════════════════════

async def _extract_and_save_preferences(
    user_id: str, msg: str, prefs: Dict
) -> Dict:
    """
    Detect and persist dietary preferences from the user's raw message.

    FIX: Negation guard — "I'm NOT vegetarian" must NOT save vegetarian.
    Logic:
      • Check for explicit negation first ("not vegetarian", "not vegan",
        "stopped being vegetarian", etc.) → treat as omnivore declaration.
      • Then check positive assertions ("I am vegetarian", "I'm vegan", etc.).
      • Bare word "vegetarian" without affirmation phrase is ignored —
        it could appear in a question like "Is paneer a vegetarian food?".
    """
    lower = msg.lower()
    updated = {**prefs}

    # ── Negation patterns — must check BEFORE positive patterns ──────────────
    _neg_veg  = ["not vegetarian", "not a vegetarian", "no longer vegetarian",
                 "stopped being vegetarian", "i eat meat", "non vegetarian",
                 "non-vegetarian", "i eat chicken", "i eat fish"]
    _neg_vegan = ["not vegan", "not a vegan", "no longer vegan",
                  "stopped being vegan", "i eat dairy", "i eat eggs"]

    # ── Positive affirmation patterns — explicit first-person statements ──────
    _pos_vegan = ["i am vegan", "i'm vegan", "i am a vegan", "i follow a vegan",
                  "i'm a vegan", "my diet is vegan"]
    _pos_veg   = ["i am vegetarian", "i'm vegetarian", "i am a vegetarian",
                  "i follow a vegetarian", "i'm a vegetarian",
                  "my diet is vegetarian", "no meat", "no fish", "no chicken",
                  "i don't eat meat", "i don't eat chicken", "i don't eat fish"]

    if any(k in lower for k in _neg_vegan) or any(k in lower for k in _neg_veg):
        # User is explicitly non-vegetarian
        updated["diet_type"] = "omnivore"
        await _save_user_preference(user_id, "diet_type", "omnivore")
    elif any(k in lower for k in _pos_vegan):
        updated["diet_type"] = "vegan"
        await _save_user_preference(user_id, "diet_type", "vegan")
    elif any(k in lower for k in _pos_veg):
        updated["diet_type"] = "vegetarian"
        await _save_user_preference(user_id, "diet_type", "vegetarian")

    # ── Allergy detection ─────────────────────────────────────────────────────
    if "gluten" in lower and "free" in lower:
        updated["allergies"] = "gluten-free"
        await _save_user_preference(user_id, "allergies", "gluten-free")
    elif "lactose" in lower:
        updated["allergies"] = "lactose-free"
        await _save_user_preference(user_id, "allergies", "lactose-free")
    elif "nut allerg" in lower or "allergic to nuts" in lower:
        updated["allergies"] = "nut-free"
        await _save_user_preference(user_id, "allergies", "nut-free")

    # ── Fitness level detection ───────────────────────────────────────────────
    if any(k in lower for k in ["beginner", "new to fitness", "just started working out",
                                  "just started gym", "never worked out"]):
        updated["fitness_level"] = "beginner"
        await _save_user_preference(user_id, "fitness_level", "beginner")
    elif any(k in lower for k in ["intermediate", "been training for", "training for a year",
                                    "workout regularly"]):
        updated["fitness_level"] = "intermediate"
        await _save_user_preference(user_id, "fitness_level", "intermediate")
    elif any(k in lower for k in ["advanced", "competitive athlete", "professional athlete",
                                    "i compete", "trained for years"]):
        updated["fitness_level"] = "advanced"
        await _save_user_preference(user_id, "fitness_level", "advanced")

    return updated


# ═══════════════════════════════════════════════════════════════════════
# Groq caller — shared between both AI systems
# ═══════════════════════════════════════════════════════════════════════

async def _call_groq(
    messages: List[Dict],
    temperature: float = 0.75,
    max_tokens: int = 512,
) -> str:
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY not configured on server.",
        )
    
    # Try llama-3.3-70b first, then fall back to high-throughput llama-3.1-8b if rate limited (429)
    models = [GROQ_MODEL, "llama-3.1-8b-instant"]
    
    for idx, model in enumerate(models):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {groq_api_key}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "model":       model,
                        "messages":    messages,
                        "max_tokens":  max_tokens,
                        "temperature": temperature,
                    },
                )
                res.raise_for_status()
                return res.json()["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and idx < len(models) - 1:
                # Output to stdout/server logs for audit
                print(f"Groq Model {model} rate limited (429). Falling back to {models[idx+1]}...")
                continue
            raise HTTPException(status_code=502, detail=f"Groq API error: {e.response.status_code}")
        except httpx.RequestError as e:
            if idx < len(models) - 1:
                print(f"Groq Model {model} request failed ({e}). Falling back to {models[idx+1]}...")
                continue
            raise HTTPException(status_code=504, detail=f"Groq unreachable: {e}")


# ═══════════════════════════════════════════════════════════════════════
# Scoring helpers (for /summary and /suggestions — kept from v1)
# ═══════════════════════════════════════════════════════════════════════

def _missed_reminders(reminders: List[Dict]) -> int:
    missed = 0
    for r in reminders:
        if r.get("enabled", True) and not r.get("completed", False):
            if r.get("type", "one_time") == "one_time":
                due = r.get("due_at") or r.get("time")
                if due:
                    try:
                        if isinstance(due, str):
                            due = datetime.fromisoformat(due)
                        if due < _utcnow():
                            missed += 1
                    except Exception:
                        pass
    return missed


def _build_suggestions(ctx: Dict, diet_type: str) -> List[Suggestion]:
    items: List[Suggestion] = []
    sid = 1

    water_deficit = ctx["water_goal_ml"] - ctx["water_ml"]
    if water_deficit > 0:
        items.append(Suggestion(
            id=f"hydration_{sid}", icon_type="hydration",
            label=f"Drink {int(water_deficit)} ml more water",
            desc=f"You've had {int(ctx['water_ml'])} ml today. {int(water_deficit)} ml more to reach your goal.",
            priority="High" if ctx["water_ml"] < 1000 else "Medium",
        )); sid += 1

    if ctx["sleep_score"] < 85:
        if ctx["sleep_h"] == 0:
            desc = "No sleep logged. Log tonight's sleep and aim for your goal."
        else:
            short = round(ctx["sleep_goal_h"] - ctx["sleep_h"], 1)
            desc = f"You slept {ctx['sleep_h']}h — {short}h short. Sleep 30 min earlier tonight."
        items.append(Suggestion(
            id=f"sleep_{sid}", icon_type="sleep",
            label="Optimise your sleep tonight", desc=desc,
            priority="High" if ctx["sleep_h"] < 5 else "Medium",
        )); sid += 1

    if ctx["protein_score"] < 85:
        deficit = round(ctx["protein_goal"] - ctx["protein_g"], 1)
        srcs    = ", ".join(_protein_sources(diet_type)[:3])
        items.append(Suggestion(
            id=f"protein_{sid}", icon_type="protein",
            label=f"Add {deficit}g protein today",
            desc=f"Logged {ctx['protein_g']:.0f}g / {ctx['protein_goal']:.0f}g. Try: {srcs}.",
            priority="High" if ctx["protein_g"] < 30 else "Low",
        )); sid += 1

    if ctx["days_since_workout"] >= 3:
        items.append(Suggestion(
            id=f"workout_{sid}", icon_type="workout",
            label="Restart your workout streak",
            desc=f"No workout in {ctx['days_since_workout']} day(s). Even 20 min helps recovery.",
            priority="High" if ctx["days_since_workout"] >= 5 else "Medium",
        )); sid += 1

    if ctx["mood_score"] < 50:
        items.append(Suggestion(
            id=f"mood_{sid}", icon_type="mood",
            label="Mental recovery check-in",
            desc="Recent mood suggests stress. Try a 10-min walk or deep breathing.",
            priority="Medium",
        )); sid += 1

    if ctx["weight_trend"] == "increasing":
        items.append(Suggestion(
            id=f"weight_{sid}", icon_type="workout",
            label="Address upward weight trend",
            desc="Weight trending up. Small calorie deficit + daily steps will help.",
            priority="Medium",
        )); sid += 1

    if not items:
        items.append(Suggestion(
            id="excellent_1", icon_type="hydration",
            label="Keep up the excellent work! 🌟",
            desc="All health metrics on track. Consistency is the real secret.",
            priority="Low",
        ))

    return items


# ═══════════════════════════════════════════════════════════════════════
# Routes
# ═══════════════════════════════════════════════════════════════════════

@router.get("/summary", response_model=HealthSummary)
async def get_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    ctx = await _load_health_context(user_id, current_user)
    score = ctx["overall_score"]

    if score >= 80:
        greeting = "You're performing great today! All key metrics on track. 💪"
    elif score >= 55:
        greeting = "A few metrics need a nudge — suggestions ready below. 🧠"
    else:
        greeting = "Health metrics need attention. Small actions compound fast. 🔥"

    return HealthSummary(
        hydration_score=ctx["water_score"],
        protein_score=ctx["protein_score"],
        sleep_score=ctx["sleep_score"],
        workout_score=ctx["workout_score"],
        mood_score=ctx["mood_score"],
        weight_trend=ctx["weight_trend"],
        overall_score=ctx["overall_score"],
        greeting_message=greeting,
    )


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(current_user: dict = Depends(get_current_user)):
    user_id   = current_user["id"]
    ctx       = await _load_health_context(user_id, current_user)
    prefs     = await _get_user_preferences(user_id)
    diet_type = prefs.get("diet_type", "")
    today_str = _utcnow().strftime("%Y-%m-%d")
    done_states = await _fetch_suggestion_states(user_id, today_str)

    suggestions = _build_suggestions(ctx, diet_type)
    for s in suggestions:
        s.done = done_states.get(s.id, False)

    return SuggestionsResponse(suggestions=suggestions)


@router.post("/suggestions/done", status_code=status.HTTP_200_OK)
async def mark_suggestion_done(
    body: MarkDoneRequest,
    current_user: dict = Depends(get_current_user),
):
    db        = get_database()
    user_id   = current_user["id"]
    today_str = _utcnow().strftime("%Y-%m-%d")
    await db["ai_suggestion_states"].update_one(
        {"user_id": user_id, "date": today_str},
        {"$set": {f"states.{body.suggestion_id}": body.done}},
        upsert=True,
    )
    return {"ok": True}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    AI Coach chat — powered by Groq Llama-3.3-70B with full context injection.

    Pipeline:
    1. Detect intent (passes has_history so mid-conversation ack = continuation)
    2. Load health context from MongoDB — skipped for non-health intents
    3. Load user preferences (diet, allergies, fitness level)
    4. Extract + save any new preferences mentioned in this message
    5. Build anti-repeat history summary (extracts numbers + actions already given)
    6. Build system prompt with all context + mandatory structure rules
    7. Call Groq — temperature and max_tokens tuned per intent
    8. Return reply + detected intent
    """
    user_id   = current_user["id"]
    user_name = (current_user.get("full_name") or "").strip().split()[0] or "there"

    # 1. Intent detection — pass has_history so "ok/thanks" mid-chat → continuation
    has_history = len(body.history) > 0
    intent = _detect_intent(body.message, has_history=has_history)

    # 2. Load health context.
    #    Skip for intents that don't need DB data — saves latency.
    _NO_DB_INTENTS = {"greeting", "unclear", "continuation", "preference"}
    if intent in _NO_DB_INTENTS:
        ctx = {
            "water_ml": 0, "water_goal_ml": 2000, "water_score": 0,
            "cal": 0, "cal_goal": 2200, "cal_score": 0,
            "protein_g": 0, "protein_goal": 100, "protein_score": 0,
            "steps": 0, "steps_goal": 10000, "steps_score": 0,
            "sleep_h": 0, "sleep_goal_h": 8, "sleep_score": 0,
            "workout_min": 0, "days_since_workout": 7, "workout_score": 0,
            "mood_val": "unknown", "mood_score": 70,
            "weight_trend": "stable", "latest_weight": None, "target_weight": None,
            "avg_water_7d": 0, "avg_cal_7d": 0, "avg_protein_7d": 0,
            "overall_score": 0, "today_log_count": 0, "logs_7d_count": 0,
        }
    else:
        ctx = await _load_health_context(user_id, current_user)

    # 3. Load preferences
    prefs = await _get_user_preferences(user_id)

    # 4. Extract + save any new preferences mentioned in this message
    prefs = await _extract_and_save_preferences(user_id, body.message, prefs)

    # 5. Anti-repeat similarity check
    is_repeat = False
    past_user_messages = [turn.content for turn in body.history if turn.role == "user"]
    if past_user_messages:
        # Compare current user message with the most recent 3 user messages
        for past_msg in past_user_messages[-3:]:
            if _get_similarity(body.message, past_msg) > 0.70:
                is_repeat = True
                break

    history_summary = _summarise_history(body.history)

    # 6. Build system prompt
    system_prompt = _build_system_prompt(
        ctx=ctx,
        user_name=user_name,
        intent=intent,
        prefs=prefs,
        history_summary=history_summary,
        is_repeat=is_repeat,
    )

    # 7. Build Groq message list: system prompt + capped history + new user message
    groq_messages = [{"role": "system", "content": system_prompt}]

    # Cap history at last 6 pairs (12 messages) to keep context tight
    for turn in body.history[-12:]:
        if turn.role in ("user", "assistant"):
            groq_messages.append({"role": turn.role, "content": turn.content})

    groq_messages.append({"role": "user", "content": body.message})

    # 8. Call Groq with intent-tuned parameters.
    #
    #    Temperature:
    #      • 0.65 for structured health analysis intents — reduces drift from
    #        the mandatory 4-section format
    #      • 0.75 for conversational intents (greeting, unclear, continuation)
    #        — allows natural, warm responses
    #
    #    max_tokens:
    #      • progress → 750  (full report needs room for all 5 metrics + trends)
    #      • standard health intents → 560  (was 512 — adds 1 extra section's worth)
    #      • conversational / short → 200  (greeting/ack should stay brief)

    if intent in ("greeting", "unclear", "continuation", "preference"):
        temperature = 0.75
        max_tokens  = 200
    elif intent == "progress":
        temperature = 0.65
        max_tokens  = 750
    elif intent == "symptom_serious":
        temperature = 0.55   # deterministic — always say "see a doctor"
        max_tokens  = 160
    else:
        # energy, sleep, hydration, protein, workout, nutrition, stress, weight, general
        temperature = 0.65
        max_tokens  = 560

    reply = await _call_groq(groq_messages, temperature=temperature, max_tokens=max_tokens)

    return ChatResponse(reply=reply, intent=intent)


# ═══════════════════════════════════════════════════════════════════════
# AI SYSTEM 1 — Floating Assistant (UNCHANGED — Groq, no user data)
# ═══════════════════════════════════════════════════════════════════════

class _AssistantMessage(_BaseModel):
    role: str
    content: str

class _AssistantRequest(_BaseModel):
    message: str
    history: List[_AssistantMessage] = []

class _AssistantResponse(_BaseModel):
    reply: str


ASSISTANT_SYSTEM_PROMPT = (
    "You are VitaAssist, a friendly and knowledgeable AI assistant built into VitaTrack, "
    "a personal health platform. You can answer ANY question the user has — health, fitness, "
    "nutrition, general knowledge, science, coding, life advice, or casual chat. "
    "Be concise, warm, and genuinely helpful. Use markdown formatting (bold, bullets) when it "
    "improves clarity. Never say you cannot answer general questions."
)


@router.post("/assistant", response_model=_AssistantResponse)
async def floating_assistant(
    body: _AssistantRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Floating AI Assistant — Groq + Llama-3.3-70B.
    General health Q&A. No user data. Completely separate from AI Coach.
    """
    messages = [{"role": "system", "content": ASSISTANT_SYSTEM_PROMPT}]
    for turn in body.history:
        if turn.role in ("user", "assistant"):
            messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": body.message})

    reply = await _call_groq(messages, temperature=0.7, max_tokens=1024)
    return _AssistantResponse(reply=reply)