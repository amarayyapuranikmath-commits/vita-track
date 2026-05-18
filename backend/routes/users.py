from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timedelta
from database import get_database
from schemas.user import UserPublic, ProfileUpdateRequest
from core.deps import get_current_user
from core.security import verify_password, hash_password
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/users", tags=["users"])


# ── Schemas ────────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class NotificationSettings(BaseModel):
    water_reminders: Optional[bool] = False
    workout_reminders: Optional[bool] = False
    sleep_reminders: Optional[bool] = False
    medicine_reminders: Optional[bool] = False

class PrivacySettings(BaseModel):
    profile_visibility: Optional[bool] = True
    analytics_sharing: Optional[bool] = True
    ai_personalization: Optional[bool] = True


# ── Helpers ────────────────────────────────────────────────────────────

def _clean(user: dict) -> dict:
    """Remove internal MongoDB fields before returning to frontend."""
    return {k: v for k, v in user.items() if k not in ("_id", "hashed_password")}


# ── GET /api/users/me ──────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _clean(current_user)


# ── PUT /api/users/profile ─────────────────────────────────────────────

@router.put("/profile", response_model=UserPublic)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    fields = {k: v for k, v in body.model_dump().items() if v is not None}

    if not fields:
        raise HTTPException(status_code=400, detail="No fields provided")

    merged = {**current_user, **fields}
    required = ["gender", "age", "height", "weight"]
    fields["profile_complete"] = all(
        merged.get(f) not in (None, "", 0) for f in required
    )

    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": fields},
    )

    updated = await db["users"].find_one(
        {"_id": ObjectId(current_user["id"])}
    )
    return _clean(updated)


# ── GET /api/users/achievements ────────────────────────────────────────

@router.get("/achievements")
async def get_achievements(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]

    # Fetch logs from last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    logs = await db["logs"].find({
        "user_id": ObjectId(user_id),
        "created_at": {"$gte": thirty_days_ago}
    }).to_list(length=500)

    total_days = 30

    # ── Current Streak ─────────────────────────────────────────────────
    # Get all unique dates user logged anything
    logged_dates = set()
    for l in logs:
        created = l.get("created_at")
        if created:
            logged_dates.add(created.strftime("%Y-%m-%d"))

    streak = 0
    check = datetime.utcnow().date()
    while str(check) in logged_dates:
        streak += 1
        check -= timedelta(days=1)

    # ── Water Consistency ──────────────────────────────────────────────
    water_goal_raw = current_user.get("water_goal")
    water_goal_val = None
    if water_goal_raw:
        try:
            water_goal_val = float(
                str(water_goal_raw)
                .replace("L", "").replace("l", "")
                .replace("liters", "").replace("liter", "")
                .strip()
            )
        except Exception:
            water_goal_val = None

    water_logs = [l for l in logs if l.get("type") == "water"]
    # Group by date, sum values
    water_by_date = {}
    for l in water_logs:
        date_key = l["created_at"].strftime("%Y-%m-%d")
        try:
            val = float(str(l.get("value", "0")).replace("L", "").replace("l", "").strip())
        except Exception:
            val = 0
        water_by_date[date_key] = water_by_date.get(date_key, 0) + val

    if water_goal_val:
        water_days_met = sum(1 for v in water_by_date.values() if v >= water_goal_val)
    else:
        water_days_met = len(water_by_date)

    water_consistency = round((water_days_met / total_days) * 100)

    # ── Workout Consistency ────────────────────────────────────────────
    workout_dates = set()
    for l in logs:
        if l.get("type") == "workout":
            workout_dates.add(l["created_at"].strftime("%Y-%m-%d"))

    workout_consistency = round((len(workout_dates) / total_days) * 100)

    # ── Sleep Consistency ──────────────────────────────────────────────
    sleep_goal_raw = current_user.get("sleep_goal")
    sleep_goal_val = None
    if sleep_goal_raw:
        try:
            sleep_goal_val = float(
                str(sleep_goal_raw)
                .replace("hrs", "").replace("hr", "")
                .replace("hours", "").replace("h", "")
                .strip()
            )
        except Exception:
            sleep_goal_val = None

    sleep_logs = [l for l in logs if l.get("type") == "sleep"]
    sleep_by_date = {}
    for l in sleep_logs:
        date_key = l["created_at"].strftime("%Y-%m-%d")
        try:
            val = float(str(l.get("value", "0")).replace("hrs", "").replace("h", "").strip())
        except Exception:
            val = 0
        sleep_by_date[date_key] = sleep_by_date.get(date_key, 0) + val

    if sleep_goal_val:
        sleep_days_met = sum(1 for v in sleep_by_date.values() if v >= sleep_goal_val)
    else:
        sleep_days_met = len(sleep_by_date)

    sleep_consistency = round((sleep_days_met / total_days) * 100)

    return {
        "streak": streak,
        "water_consistency": min(water_consistency, 100),
        "workout_consistency": min(workout_consistency, 100),
        "sleep_consistency": min(sleep_consistency, 100),
    }


# ── POST /api/users/change-password ───────────────────────────────────

@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    # Fetch full user doc to get hashed_password
    user_doc = await db["users"].find_one({"_id": ObjectId(current_user["id"])})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.current_password, user_doc["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"hashed_password": hash_password(body.new_password)}}
    )

    return {"message": "Password changed successfully"}


# ── GET /api/users/notifications ──────────────────────────────────────

@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_doc = await db["users"].find_one({"_id": ObjectId(current_user["id"])})
    prefs = user_doc.get("notification_settings", {})
    return {
        "water_reminders":   prefs.get("water_reminders", False),
        "workout_reminders": prefs.get("workout_reminders", False),
        "sleep_reminders":   prefs.get("sleep_reminders", False),
        "medicine_reminders":prefs.get("medicine_reminders", False),
    }


# ── PUT /api/users/notifications ──────────────────────────────────────

@router.put("/notifications")
async def update_notifications(
    body: NotificationSettings,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"notification_settings": body.model_dump()}}
    )
    return body.model_dump()


# ── GET /api/users/privacy ────────────────────────────────────────────

@router.get("/privacy")
async def get_privacy(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_doc = await db["users"].find_one({"_id": ObjectId(current_user["id"])})
    prefs = user_doc.get("privacy_settings", {})
    return {
        "profile_visibility":  prefs.get("profile_visibility", True),
        "analytics_sharing":   prefs.get("analytics_sharing", True),
        "ai_personalization":  prefs.get("ai_personalization", True),
    }


# ── PUT /api/users/privacy ────────────────────────────────────────────

@router.put("/privacy")
async def update_privacy(
    body: PrivacySettings,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    await db["users"].update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"privacy_settings": body.model_dump()}}
    )
    return body.model_dump()