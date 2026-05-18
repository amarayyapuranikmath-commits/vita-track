from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LogCreate(BaseModel):
    type: str           # "weight" | "meal" | "water" | "sleep" | "workout" | "medicine" | "mood" | "notes"
    value: str          # main display value — e.g. "Chicken Rice · 450 kcal · 32g protein"
    note: Optional[str] = None   # optional extra note; for meal logs this carries JSON structured data

    # ── Meal-specific structured fields ───────────────────────────────
    # These are optional so all existing non-meal logs are backward compatible.
    # When a meal is logged from the frontend:
    #   value      = human-readable display string ("Chicken Rice · 450 kcal · 32g protein")
    #   note       = JSON string with structured data ({"meal_name": ..., "calories": ..., "protein": ...})
    #   meal_name  = the raw meal name (optional direct field)
    #   calories   = numeric calories (optional direct field)
    #   protein    = numeric protein in grams (optional direct field)
    meal_name: Optional[str]   = None
    calories:  Optional[float] = None
    protein:   Optional[float] = None   # NEW — protein in grams


class LogOut(BaseModel):
    id:         str
    user_id:    str
    type:       str
    value:      str
    note:       Optional[str]   = None
    # ── Meal structured fields returned to frontend ────────────────────
    meal_name:  Optional[str]   = None
    calories:   Optional[float] = None
    protein:    Optional[float] = None   # NEW — backward compatible (None for old logs)
    created_at: datetime