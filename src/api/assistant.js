// src/api/assistant.js
// ─────────────────────────────────────────────────────────────
// Floating AI Assistant API — completely separate from AI Coach
// Handles: POST /api/ai/assistant
// ─────────────────────────────────────────────────────────────

import axiosInstance from "./axios";

/**
 * Send a message to the floating assistant.
 *
 * @param {string} message        - The user's current message
 * @param {Array}  history        - Prior turns: [{ role, content }, ...]
 *                                  role is "user" or "assistant"
 * @returns {Promise<string>}     - The assistant's reply text
 */
export async function sendAssistantMessage(message, history = []) {
    const { data } = await axiosInstance.post("/api/ai/assistant", {
        message,
        history,   // full conversation history for memory
    });
    return data.reply;
}