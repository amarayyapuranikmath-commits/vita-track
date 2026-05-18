/**
 * src/pages/app/AICoachPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * VitaAI Coach page — Groq LLM-powered coaching.
 *
 * v2 changes (ChatModal only — rest of page is pixel-identical to original):
 *  • sendAIMessage now receives full conversation history for real multi-turn
 *    memory and anti-repeat logic inside the Groq prompt.
 *  • History tracked as [{ role: "user"|"assistant", content: string }].
 *  • Quick prompts expanded to 6 covering all intents.
 *  • Sending with Enter key added.
 *  • All other UI: zero changes.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Droplets, Footprints, BedDouble, Beef,
    Sparkles, ChevronRight, CheckCircle2, Brain,
    Activity, Send, X, Loader2, Bell, Smile, Dumbbell,
} from "lucide-react";

import { getAISummary, getAISuggestions, markSuggestionDone, sendAIMessage } from "../../api/ai";

/* ─── Icon map (backend icon_type → Lucide component) ───────────────────── */
const ICON_MAP = {
    hydration: { icon: Droplets, color: "#06B6D4", bg: "#E0F9FD" },
    sleep: { icon: BedDouble, color: "#8B5CF6", bg: "#F0EBFF" },
    protein: { icon: Beef, color: "#22C55E", bg: "#DCFCE7" },
    workout: { icon: Dumbbell, color: "#FF6B00", bg: "#FFF0E6" },
    mood: { icon: Smile, color: "#F59E0B", bg: "#FEF3C7" },
    reminder: { icon: Bell, color: "#6366F1", bg: "#EEF2FF" },
    steps: { icon: Footprints, color: "#FF6B00", bg: "#FFF0E6" },
};

const PRIORITY = {
    High: { bg: "#FEE2E2", text: "#EF4444" },
    Medium: { bg: "#FEF3C7", text: "#F59E0B" },
    Low: { bg: "#DCFCE7", text: "#22C55E" },
};

/* ─── Chat modal ─────────────────────────────────────────────────────────── */
function ChatModal({ onClose, summaryGreeting }) {
    const [messages, setMessages] = useState([
        {
            id: 0,
            role: "ai",
            text: "Hi! 👋 What would you like to work on today? Ask me anything about your health, sleep, nutrition, or fitness.",
        },
    ]);
    // Conversation history for Groq — parallel array of { role, content }
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    async function send(text) {
        const msg = (text || input).trim();
        if (!msg || typing) return;
        setInput("");

        // Add user message to display
        const userMsg = { id: Date.now(), role: "user", text: msg };
        setMessages(p => [...p, userMsg]);

        // Build history to send (all previous turns, NOT including current message)
        const currentHistory = history;

        setTyping(true);
        try {
            const { reply } = await sendAIMessage(msg, currentHistory);

            // Update display
            setMessages(p => [...p, { id: Date.now() + 1, role: "ai", text: reply }]);

            // Update conversation history with this turn
            setHistory(prev => [
                ...prev,
                { role: "user", content: msg },
                { role: "assistant", content: reply },
            ]);
        } catch {
            setMessages(p => [
                ...p,
                {
                    id: Date.now() + 2,
                    role: "ai",
                    text: "Sorry, I couldn't reach the server. Please check your connection and try again.",
                },
            ]);
        } finally {
            setTyping(false);
            // Re-focus input after reply
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    // Expanded quick prompts covering all intent types
    const quickPrompts = [
        "How am I doing?",
        "Boost my energy",
        "Improve my sleep",
        "Plan my nutrition",
        "Workout advice",
        "Check my hydration",
    ];

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/25 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
                className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: "min(580px, 92dvh)" }}
                initial={{ y: 56, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 56, opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
            >
                {/* Top strip */}
                <div className="h-1 flex-shrink-0"
                    style={{ background: "linear-gradient(90deg,#FF6B00,#8B5CF6)" }} />

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F3F4F6] flex-shrink-0">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#F0EBFF,#FFF0E6)" }}>
                        🧠
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111827]">VitaAI Coach</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-[#6B7280]">Online · Powered by Groq</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
                    >
                        <X size={14} className="text-[#6B7280]" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
                    style={{ scrollbarWidth: "none" }}>
                    <AnimatePresence initial={false}>
                        {messages.map(m => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                                className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                            >
                                {m.role === "ai" && (
                                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                                        style={{ background: "linear-gradient(135deg,#F0EBFF,#FFF0E6)" }}>
                                        🧠
                                    </div>
                                )}
                                <div
                                    className="max-w-[78%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
                                    style={{
                                        borderRadius: m.role === "ai" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                                        background: m.role === "ai"
                                            ? "#F9FAFB"
                                            : "linear-gradient(135deg,#FF6B00,#F59E0B)",
                                        color: m.role === "ai" ? "#111827" : "#fff",
                                    }}
                                >
                                    {m.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing dots */}
                    {typing && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2.5 items-center"
                        >
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#F0EBFF,#FFF0E6)" }}>🧠</div>
                            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-[#F9FAFB]"
                                style={{ borderRadius: "4px 18px 18px 18px" }}>
                                {[0, 1, 2].map(i => (
                                    <motion.div key={i}
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: "#8B5CF6" }}
                                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Quick prompts — expanded to 6 */}
                <div className="px-5 pb-2 flex gap-2 overflow-x-auto flex-shrink-0"
                    style={{ scrollbarWidth: "none" }}>
                    {quickPrompts.map(q => (
                        <button key={q} onClick={() => send(q)}
                            disabled={typing}
                            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#6B7280] bg-[#FAFAFA] hover:border-[#FDBA74] transition-colors whitespace-nowrap disabled:opacity-50">
                            {q}
                        </button>
                    ))}
                </div>

                {/* Input — Enter to send */}
                <div className="px-5 pb-5 pt-2 flex gap-3 flex-shrink-0 border-t border-[#F3F4F6]">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask VitaAI anything…"
                        disabled={typing}
                        className="flex-1 text-sm px-4 py-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FDBA74] transition-colors disabled:opacity-60"
                    />
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => send()}
                        disabled={!input.trim() || typing}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                        style={{ background: "linear-gradient(135deg,#FF6B00,#F59E0B)" }}
                    >
                        {typing
                            ? <Loader2 size={16} className="text-white animate-spin" />
                            : <Send size={16} className="text-white" />
                        }
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─── AICoachPage — IDENTICAL to original, only imports ChatModal above ─── */
export default function AICoachPage() {
    const [chatOpen, setChatOpen] = useState(false);

    // ── Remote state ─────────────────────────────────────────────────────────
    const [suggestions, setSuggestions] = useState([]);
    const [greetingMessage, setGreetingMessage] = useState(
        "I've analysed your health data. Your suggestions are ready below. I'm here whenever you need guidance. 💪"
    );
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [error, setError] = useState(null);

    // ── Fetch summary (greeting) ──────────────────────────────────────────────
    useEffect(() => {
        getAISummary()
            .then(data => setGreetingMessage(data.greeting_message))
            .catch(() => {/* use fallback greeting */ })
            .finally(() => setLoadingSummary(false));
    }, []);

    // ── Fetch suggestions ─────────────────────────────────────────────────────
    useEffect(() => {
        getAISuggestions()
            .then(data => setSuggestions(data.suggestions))
            .catch(() => setError("Couldn't load suggestions. Please refresh."))
            .finally(() => setLoadingSuggestions(false));
    }, []);

    // ── Toggle done — optimistic update + persist ─────────────────────────────
    async function handleToggleDone(suggestionId) {
        setSuggestions(prev =>
            prev.map(s =>
                s.id === suggestionId ? { ...s, done: !s.done } : s
            )
        );
        const updated = suggestions.find(s => s.id === suggestionId);
        if (!updated) return;
        try {
            await markSuggestionDone(suggestionId, !updated.done);
        } catch {
            // Revert on failure
            setSuggestions(prev =>
                prev.map(s =>
                    s.id === suggestionId ? { ...s, done: updated.done } : s
                )
            );
        }
    }

    const completedCount = suggestions.filter(s => s.done).length;

    return (
        <div className="min-h-screen" style={{ background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        .playfair { font-family: 'Playfair Display', serif; }
      `}</style>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-5">

                {/* ── Page header ──────────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="mb-2"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#9CA3AF] mb-1.5">
                        Wellness AI
                    </p>
                    <h1 className="playfair text-3xl sm:text-4xl font-bold text-[#111827]">
                        AI Health Coach
                    </h1>
                </motion.div>

                {/* ════════════════════════════════════════════════════
            Section 1 — VitaAI Coach
        ════════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm overflow-hidden"
                >
                    {/* Accent strip */}
                    <div className="h-[3px]"
                        style={{ background: "linear-gradient(90deg,#FF6B00,#F59E0B,#8B5CF6)" }} />

                    <div className="p-7 sm:p-9">

                        {/* Card title row */}
                        <div className="flex items-start justify-between gap-4 mb-8">
                            <div>
                                <h2 className="playfair text-2xl font-bold text-[#111827] leading-snug">
                                    VitaAI Coach 🧠
                                </h2>
                                <p className="text-sm text-[#6B7280] font-light mt-0.5">
                                    Your personal health mentor
                                </p>
                            </div>

                            {/* Live badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5E7EB] flex-shrink-0 bg-[#F0FDF4]">
                                <Activity size={11} className="text-[#22C55E]" />
                                <span className="text-[11px] font-semibold text-[#22C55E]">
                                    Monitoring Live
                                </span>
                            </div>
                        </div>

                        {/* Avatar + welcome bubble */}
                        <div className="flex items-start gap-4 sm:gap-5">
                            {/* Avatar */}
                            <div className="flex-shrink-0 relative">
                                <div
                                    className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[22px] flex items-center justify-center text-3xl shadow-sm"
                                    style={{ background: "linear-gradient(145deg,#F0EBFF,#FFF0E6)" }}
                                >
                                    🧠
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#F3F4F6]">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                </div>
                            </div>

                            {/* Message bubble */}
                            <div className="flex-1 min-w-0">
                                <div
                                    className="px-5 py-4 text-sm leading-relaxed text-[#374151]"
                                    style={{
                                        background: "#F9FAFB",
                                        borderRadius: "4px 20px 20px 20px",
                                    }}
                                >
                                    {loadingSummary ? (
                                        <span className="flex items-center gap-2 text-[#9CA3AF]">
                                            <Loader2 size={13} className="animate-spin" />
                                            Analysing your health data…
                                        </span>
                                    ) : (
                                        <span className="whitespace-pre-line">{greetingMessage}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-2 ml-1">
                                    <Sparkles size={11} style={{ color: "#8B5CF6" }} />
                                    <span className="text-[11px] text-[#9CA3AF]">VitaAI · Just now</span>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-8 pt-6 border-t border-[#F3F4F6]">
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(255,107,0,.26)" }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setChatOpen(true)}
                                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-white text-sm font-semibold"
                                style={{
                                    background: "linear-gradient(135deg,#FF6B00,#F59E0B)",
                                    boxShadow: "0 4px 18px rgba(255,107,0,.2)",
                                }}
                            >
                                <Brain size={16} />
                                Ask VitaAI
                                <ChevronRight size={15} className="opacity-70" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* ════════════════════════════════════════════════════
            Section 2 — Today's Suggestions
        ════════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm overflow-hidden"
                >
                    <div className="h-[3px]"
                        style={{ background: "linear-gradient(90deg,#8B5CF6,#06B6D4)" }} />

                    <div className="p-7 sm:p-9">

                        {/* Card title row */}
                        <div className="flex items-center justify-between mb-7">
                            <div>
                                <h2 className="playfair text-2xl font-bold text-[#111827] leading-snug">
                                    Today's Suggestions ✨
                                </h2>
                                <p className="text-sm text-[#6B7280] font-light mt-0.5">
                                    Personalised actions curated for you
                                </p>
                            </div>
                            {!loadingSuggestions && !error && (
                                <span
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
                                    style={{ background: "#F0EBFF", color: "#8B5CF6" }}
                                >
                                    {completedCount}/{suggestions.length} done
                                </span>
                            )}
                        </div>

                        {/* Loading state */}
                        {loadingSuggestions && (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
                                <p className="text-sm text-[#9CA3AF]">VitaAI is analysing your health data…</p>
                            </div>
                        )}

                        {/* Error state */}
                        {!loadingSuggestions && error && (
                            <div className="text-center py-10">
                                <p className="text-sm text-[#EF4444]">{error}</p>
                            </div>
                        )}

                        {/* Suggestion rows */}
                        {!loadingSuggestions && !error && (
                            <div className="space-y-3">
                                {suggestions.map((s, i) => {
                                    const isDone = !!s.done;
                                    const iconMeta = ICON_MAP[s.icon_type] || ICON_MAP["workout"];
                                    const IconComponent = iconMeta.icon;

                                    return (
                                        <motion.div
                                            key={s.id}
                                            initial={{ opacity: 0, x: -14 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                delay: 0.25 + i * 0.07,
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 26,
                                            }}
                                            className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200"
                                            style={{
                                                borderColor: isDone ? "#DCFCE7" : "#F3F4F6",
                                                background: isDone ? "#F0FDF4" : "#FAFAFA",
                                            }}
                                        >
                                            {/* Icon */}
                                            <div
                                                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                                style={{ background: isDone ? "#DCFCE7" : iconMeta.bg }}
                                            >
                                                {isDone
                                                    ? <CheckCircle2 size={20} style={{ color: "#22C55E" }} />
                                                    : <IconComponent size={20} style={{ color: iconMeta.color }} />
                                                }
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span
                                                        className={`text-sm font-semibold transition-all ${isDone ? "line-through text-[#9CA3AF]" : "text-[#111827]"
                                                            }`}
                                                    >
                                                        {s.label}
                                                    </span>
                                                    {!isDone && PRIORITY[s.priority] && (
                                                        <span
                                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{
                                                                background: PRIORITY[s.priority].bg,
                                                                color: PRIORITY[s.priority].text,
                                                            }}
                                                        >
                                                            {s.priority}
                                                        </span>
                                                    )}
                                                </div>
                                                <p
                                                    className="text-xs mt-0.5 leading-relaxed transition-all"
                                                    style={{ color: isDone ? "#9CA3AF" : "#6B7280" }}
                                                >
                                                    {isDone ? "Great job! Marked as complete." : s.desc}
                                                </p>
                                            </div>

                                            {/* Action button */}
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.94 }}
                                                onClick={() => handleToggleDone(s.id)}
                                                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                                                style={
                                                    isDone
                                                        ? { background: "#DCFCE7", color: "#22C55E" }
                                                        : { background: iconMeta.bg, color: iconMeta.color }
                                                }
                                            >
                                                {isDone ? (
                                                    <><CheckCircle2 size={12} /> Done</>
                                                ) : (
                                                    <>Do it <ChevronRight size={11} /></>
                                                )}
                                            </motion.button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-6 pt-5 border-t border-[#F3F4F6] flex items-center justify-between">
                            <p className="text-xs text-[#9CA3AF]">
                                Refreshes every morning at 6 AM
                            </p>
                            <button
                                onClick={() => setChatOpen(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                                style={{ color: "#8B5CF6" }}
                            >
                                <Sparkles size={12} />
                                More from AI
                            </button>
                        </div>
                    </div>
                </motion.div>

            </div>

            {/* ── Chat modal ──────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {chatOpen && (
                    <ChatModal
                        onClose={() => setChatOpen(false)}
                        summaryGreeting={greetingMessage}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}