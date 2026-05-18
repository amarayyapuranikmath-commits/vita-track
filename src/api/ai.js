/**
 * src/api/ai.js
 * ─────────────────────────────────────────────────────────────────────────────
 * VitaAI Coach — API layer
 *
 * Calls:
 *   GET  /api/ai/summary           → health scores + greeting message
 *   GET  /api/ai/suggestions        → personalised suggestion cards
 *   POST /api/ai/suggestions/done   → persist done-state in MongoDB
 *   POST /api/ai/chat               → Groq-powered coaching reply
 *
 * v2 change: sendAIMessage now accepts full conversation history so the
 * backend can inject it into the Groq prompt for real multi-turn memory
 * and anti-repeat logic.
 */

import api from "./axios";

// ── Health summary ────────────────────────────────────────────────────────────

export async function getAISummary() {
    const { data } = await api.get("/api/ai/summary");
    return data;
}

// ── Suggestions ───────────────────────────────────────────────────────────────

export async function getAISuggestions() {
    const { data } = await api.get("/api/ai/suggestions");
    return data;
}

export async function markSuggestionDone(suggestionId, done) {
    const { data } = await api.post("/api/ai/suggestions/done", {
        suggestion_id: suggestionId,
        done,
    });
    return data;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

/**
 * Sends a user message to VitaAI Coach (Groq LLM) with full conversation history.
 *
 * @param {string}  message  — The user's current message
 * @param {Array}   history  — Previous turns: [{ role: "user"|"assistant", content: string }]
 * @returns {Promise<{ reply: string, intent: string }>}
 */
export async function sendAIMessage(message, history = []) {
    const { data } = await api.post("/api/ai/chat", {
        message,
        history,   // ← v2: send full conversation history to backend
    });
    return data;   // { reply: string, intent: string }
}