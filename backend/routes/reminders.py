from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from database import get_database
from schemas.reminder import ReminderCreate, ReminderUpdate
from core.deps import get_current_user

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

# ── Category visual meta ──────────────────────────────────────────────
CATEGORY_META = {
    "water":    {"emoji": "💧", "color": "#06B6D4", "bg": "#E0F9FD"},
    "meal":     {"emoji": "🍽️", "color": "#F59E0B", "bg": "#FEF3C7"},
    "workout":  {"emoji": "💪", "color": "#FF6B00", "bg": "#FFF0E6"},
    "sleep":    {"emoji": "🌙", "color": "#8B5CF6", "bg": "#F0EBFF"},
    "medicine": {"emoji": "💊", "color": "#EF4444", "bg": "#FEE2E2"},
    "weight":   {"emoji": "⚖️", "color": "#22C55E", "bg": "#DCFCE7"},
    "stretch":  {"emoji": "🧘", "color": "#06B6D4", "bg": "#E0F9FD"},
    "custom":   {"emoji": "🔔", "color": "#8B5CF6", "bg": "#F0EBFF"},
}


def _serialize(doc: dict) -> dict:
    meta = CATEGORY_META.get(doc.get("category", "custom"), CATEGORY_META["custom"])
    return {
        "id":              str(doc["_id"]),
        "user_id":         str(doc["user_id"]),
        "category":        doc.get("category", "custom"),
        "name":            doc.get("name", ""),
        "date":            doc.get("date", ""),
        "time":            doc.get("time", ""),
        "repeat":          doc.get("repeat", "daily"),
        "custom_days":     doc.get("custom_days", []),
        "sound":           doc.get("sound", True),
        "push":            doc.get("push", True),
        "vibration":       doc.get("vibration", False),
        "enabled":         doc.get("enabled", True),
        "completed_today": doc.get("completed_today", False),
        "created_at":      doc["created_at"],
        # visual helpers for frontend
        "emoji":           meta["emoji"],
        "color":           meta["color"],
        "bg":              meta["bg"],
    }


# ── GET /api/reminders ────────────────────────────────────────────────
@router.get("")
async def get_reminders(
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    cursor = db["reminders"].find(
        {"user_id": ObjectId(current_user["id"])}
    ).sort("created_at", -1)
    docs = await cursor.to_list(length=500)
    return [_serialize(d) for d in docs]


# ── POST /api/reminders ───────────────────────────────────────────────
@router.post("", status_code=201)
async def create_reminder(
    body: ReminderCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    doc = {
        "user_id":         ObjectId(current_user["id"]),
        "category":        body.category,
        "name":            body.name,
        "date":            body.date or "",
        "time":            body.time,
        "repeat":          body.repeat,
        "custom_days":     body.custom_days,
        "sound":           body.sound,
        "push":            body.push,
        "vibration":       body.vibration,
        "enabled":         body.enabled,
        "completed_today": False,
        "created_at":      datetime.utcnow(),
    }
    result = await db["reminders"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ── PATCH /api/reminders/{id} ─────────────────────────────────────────
@router.patch("/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    body: ReminderUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(reminder_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid reminder ID")

    existing = await db["reminders"].find_one({
        "_id":     oid,
        "user_id": ObjectId(current_user["id"]),
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Build update dict — only fields explicitly provided
    updates = {k: v for k, v in body.dict().items() if v is not None}

    # Special rule: when a "once" reminder is triggered (completed_today=True),
    # also disable it so it doesn't fire again.
    if updates.get("completed_today") is True and existing.get("repeat") == "once":
        updates["enabled"] = False

    if not updates:
        return _serialize(existing)

    await db["reminders"].update_one({"_id": oid}, {"$set": updates})
    updated = await db["reminders"].find_one({"_id": oid})
    return _serialize(updated)


# ── DELETE /api/reminders/{id} ────────────────────────────────────────
@router.delete("/{reminder_id}", status_code=200)
async def delete_reminder(
    reminder_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(reminder_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid reminder ID")

    existing = await db["reminders"].find_one({
        "_id":     oid,
        "user_id": ObjectId(current_user["id"]),
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")

    await db["reminders"].delete_one({"_id": oid})
    return {"message": "Reminder deleted"}