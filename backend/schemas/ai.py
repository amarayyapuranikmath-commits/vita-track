# backend/schemas/ai.py
from pydantic import BaseModel, Field
from typing import Optional, List


# ── Chat ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """Single turn in the conversation history."""
    role: str       # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)   # ← NEW: full conversation


class ChatResponse(BaseModel):
    reply: str
    intent: str = "unknown"    # ← NEW: detected intent returned to frontend


# ── Suggestion ───────────────────────────────────────────────────────────────

class Suggestion(BaseModel):
    id: str
    icon_type: str          # "hydration" | "sleep" | "protein" | "workout" | "mood" | "reminder"
    label: str
    desc: str
    priority: str           # "High" | "Medium" | "Low"
    done: bool = False


class SuggestionsResponse(BaseModel):
    suggestions: List[Suggestion]


# ── Mark done ────────────────────────────────────────────────────────────────

class MarkDoneRequest(BaseModel):
    suggestion_id: str
    done: bool


# ── Health summary ───────────────────────────────────────────────────────────

class HealthSummary(BaseModel):
    hydration_score: int        # 0-100
    protein_score: int
    sleep_score: int
    workout_score: int
    mood_score: int
    weight_trend: str           # "stable" | "increasing" | "decreasing"
    overall_score: int
    greeting_message: str