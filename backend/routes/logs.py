from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
import json

from database import get_database
from schemas.log import LogCreate, LogOut
from core.deps import get_current_user


router = APIRouter(prefix="/api/logs", tags=["logs"])


def _serialize(log: dict) -> dict:
    """
    Convert a MongoDB document to a clean dict for the frontend.

    Backward compatible:
    - Old meal logs (no protein/calories/meal_name fields) → return None for those fields.
    - New meal logs → return the stored structured fields.

    The frontend stores structured meal data in two places:
    1. `value`     — human-readable display string, always present
    2. `note`      — JSON string with { meal_name, calories, protein } (for meal logs)
    3. `meal_name`, `calories`, `protein` — also stored as top-level fields for easy querying
    """
    return {
        "id":         str(log["_id"]),
        "user_id":    str(log["user_id"]),
        "type":       log["type"],
        "value":      log["value"],
        "note":       log.get("note"),
        # Meal structured fields — None for old logs (backward compatible)
        "meal_name":  log.get("meal_name"),
        "calories":   log.get("calories"),
        "protein":    log.get("protein"),
        "created_at": log["created_at"],
    }


def _parse_meal_note(note: str) -> dict:
    """
    Try to parse the JSON meal note sent by the frontend.
    Returns empty dict if parsing fails (safe fallback).
    Example note: '{"meal_name": "Chicken Rice", "calories": 450, "protein": 32}'
    """
    if not note:
        return {}
    try:
        parsed = json.loads(note)
        if isinstance(parsed, dict):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    return {}


# ── POST /api/logs ─────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_log(
    body: LogCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    valid_types = {
        "weight", "meal", "water", "sleep",
        "workout", "medicine", "mood", "notes", "steps"
    }
    if body.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid log type: {body.type}")

    # Base document — applies to all log types
    doc = {
        "user_id":    ObjectId(current_user["id"]),
        "type":       body.type,
        "value":      body.value,
        "note":       body.note,
        "created_at": datetime.utcnow(),
    }

    # ── Meal-specific structured data ──────────────────────────────────
    # Strategy: the frontend sends a JSON blob in `note` with structured data.
    # We parse it and also store the fields as top-level keys in MongoDB
    # so they are easy to query (e.g. aggregate total protein for the day).
    #
    # We also accept meal_name / calories / protein as direct fields on the
    # request body (LogCreate) in case a future client sends them directly.
    #
    # Backward compatible: non-meal logs have none of these fields → None.
    if body.type == "meal":
        # Try parsing structured data from the JSON note first
        meal_data = _parse_meal_note(body.note)

        # Prefer direct body fields over parsed note (future-proofing)
        meal_name = body.meal_name or meal_data.get("meal_name")
        calories  = body.calories  if body.calories  is not None else meal_data.get("calories")
        protein   = body.protein   if body.protein   is not None else meal_data.get("protein")

        # Store as top-level fields for easy aggregation later
        if meal_name is not None:
            doc["meal_name"] = meal_name
        if calories is not None:
            doc["calories"] = calories
        if protein is not None:
            doc["protein"] = protein

    result = await db["logs"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ── GET /api/logs ──────────────────────────────────────────────────────
@router.get("", response_model=list[LogOut])
async def get_logs(
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    cursor = db["logs"].find(
        {"user_id": ObjectId(current_user["id"])}
    ).sort("created_at", -1)   # newest first

    logs = await cursor.to_list(length=200)
    return [_serialize(log) for log in logs]


# ── DELETE /api/logs/{log_id} ──────────────────────────────────────────
@router.delete("/{log_id}", status_code=200)
async def delete_log(
    log_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    try:
        oid = ObjectId(log_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid log ID")

    log = await db["logs"].find_one({
        "_id":     oid,
        "user_id": ObjectId(current_user["id"]),
    })

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    await db["logs"].delete_one({"_id": oid})
    return {"message": "Log deleted successfully"}