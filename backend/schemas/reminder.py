from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


class ReminderCreate(BaseModel):
    category:    str
    name:        str
    date:        Optional[str] = ""   # required when repeat == "once"
    time:        str
    repeat:      str = "daily"        # once | daily | weekdays | weekends | custom
    custom_days: List[str] = []       # ["Mon","Tue",...] when repeat == "custom"
    sound:       bool = True
    push:        bool = True
    vibration:   bool = False
    enabled:     bool = True

    @validator("repeat", pre=True)
    def normalise_repeat(cls, v):
        mapping = {
            "onetime":  "once",
            "one time": "once",
            "once":     "once",
            "daily":    "daily",
            "weekdays": "weekdays",
            "weekends": "weekends",
            "custom":   "custom",
        }
        key = v.lower().strip()
        if key not in mapping:
            raise ValueError(f"Invalid repeat value: {v}")
        return mapping[key]

    @validator("date", always=True)
    def date_required_for_once(cls, v, values):
        if values.get("repeat") == "once" and not v:
            raise ValueError("date is required for One Time reminders")
        return v or ""

    @validator("custom_days", always=True)
    def custom_days_required(cls, v, values):
        if values.get("repeat") == "custom" and not v:
            raise ValueError("custom_days is required when repeat is custom")
        return v


class ReminderUpdate(BaseModel):
    category:        Optional[str]       = None
    name:            Optional[str]       = None
    date:            Optional[str]       = None
    time:            Optional[str]       = None
    repeat:          Optional[str]       = None
    custom_days:     Optional[List[str]] = None
    sound:           Optional[bool]      = None
    push:            Optional[bool]      = None
    vibration:       Optional[bool]      = None
    enabled:         Optional[bool]      = None
    completed_today: Optional[bool]      = None


class ReminderOut(BaseModel):
    id:              str
    user_id:         str
    category:        str
    name:            str
    date:            str
    time:            str
    repeat:          str
    custom_days:     List[str]
    sound:           bool
    push:            bool
    vibration:       bool
    enabled:         bool
    completed_today: bool
    created_at:      datetime