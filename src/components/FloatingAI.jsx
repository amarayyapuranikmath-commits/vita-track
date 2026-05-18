// src/components/FloatingAI.jsx
// ─────────────────────────────────────────────────────────────
// Floating AI Assistant — globally mounted in AppLayout
// Uses Groq + Llama 3.3-70B via POST /api/ai/assistant
// Completely separate from AICoachPage / ai.js
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { sendAssistantMessage } from "../api/assistant";

// ── Premium AI icon — clean spark SVG, health-tech feel ─────
function AISparkIcon({ size = 28, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Central star/spark */}
            <path
                d="M16 3L17.8 12.2L27 14L17.8 15.8L16 25L14.2 15.8L5 14L14.2 12.2L16 3Z"
                fill="white"
                fillOpacity="0.95"
            />
            {/* Small accent spark top-right */}
            <path
                d="M24 5L24.9 8.1L28 9L24.9 9.9L24 13L23.1 9.9L20 9L23.1 8.1L24 5Z"
                fill="white"
                fillOpacity="0.6"
            />
            {/* Small accent spark bottom-left */}
            <path
                d="M8 20L8.7 22.3L11 23L8.7 23.7L8 26L7.3 23.7L5 23L7.3 22.3L8 20Z"
                fill="white"
                fillOpacity="0.5"
            />
        </svg>
    );
}

// ── Markdown-lite renderer (bold + bullets, no external dep) ─
function renderMarkdown(text) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
        );
        if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
            return (
                <div key={i} className="flex gap-1.5 my-0.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{parts}</span>
                </div>
            );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <div key={i}>{parts}</div>;
    });
}

// ── Typing indicator ─────────────────────────────────────────
function TypingDots() {
    return (
        <div className="flex items-center gap-1 px-3 py-2">
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-purple-400 opacity-60"
                    style={{ animation: `vitaBounce 1.2s ${i * 0.2}s infinite ease-in-out` }}
                />
            ))}
        </div>
    );
}

// ── Main component ───────────────────────────────────────────
export default function FloatingAI() {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const panelRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        if (open && !minimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [history, loading, open, minimized]);

    // Focus input when chat opens
    useEffect(() => {
        if (open && !minimized) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [open, minimized]);

    const handleOpen = () => { setOpen(true); setMinimized(false); };
    const handleClose = () => { setOpen(false); setMinimized(false); };
    const handleMinimize = () => setMinimized(true);
    const handleMaximize = () => setMinimized(false);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userTurn = { role: "user", content: text };
        const nextHistory = [...history, userTurn];

        setHistory(nextHistory);
        setInput("");
        setLoading(true);

        try {
            const reply = await sendAssistantMessage(text, history);
            setHistory([...nextHistory, { role: "assistant", content: reply }]);
        } catch (err) {
            const errMsg =
                err?.response?.status === 503
                    ? "⚠️ Assistant not configured. Ask your admin to set GROQ_API_KEY."
                    : err?.response?.status === 401
                        ? "⚠️ Authentication error. Please log in again."
                        : "⚠️ Something went wrong. Please try again.";
            setHistory([...nextHistory, { role: "assistant", content: errMsg }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, history]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Render ──────────────────────────────────────────────────
    return (
        <>
            {/* Keyframe injection */}
            <style>{`
        @keyframes vitaBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes vitaSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes vitaPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .vita-panel { animation: vitaSlideUp 0.22s cubic-bezier(.22,.68,0,1.2) both; }
        .vita-pop   { animation: vitaPop 0.25s ease both; }
      `}</style>

            {/* ── Trigger button — position + classes preserved exactly ── */}
            <button
                onClick={open ? (minimized ? handleMaximize : handleClose) : handleOpen}
                className="fixed bottom-6 right-6 w-16 h-16 rounded-2xl text-white text-2xl shadow-xl z-50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)" }}
                title={open ? "Close assistant" : "Open VitaAssist"}
            >
                {/* ✦ New: clean SVG spark icon — replaces 🧠 emoji */}
                <AISparkIcon size={28} />
            </button>

            {/* ── Chat panel ──────────────────────────────────────────── */}
            {open && (
                <div
                    ref={panelRef}
                    className="vita-panel fixed z-40 flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-white/20"
                    style={{
                        bottom: "5.5rem",
                        right: "1.5rem",
                        // ↑ Slightly larger than before: 380→420px wide, 520→580px tall
                        width: "min(420px, calc(100vw - 2rem))",
                        height: minimized ? "auto" : "min(580px, calc(100vh - 8rem))",
                        background: "rgba(255,255,255,0.97)",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 shrink-0"
                        style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)" }}
                    >
                        <div className="flex items-center gap-2.5">
                            <AISparkIcon size={22} />
                            <div>
                                <p className="text-white font-semibold text-sm leading-none">VitaAssist</p>
                                <p className="text-white/75 text-xs mt-0.5">
                                    {loading ? "Thinking…" : "Ask me anything"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Minimize */}
                            <button
                                onClick={minimized ? handleMaximize : handleMinimize}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition-colors"
                                title={minimized ? "Expand" : "Minimize"}
                            >
                                {minimized ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <polyline points="18 15 12 9 6 15" />
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                )}
                            </button>
                            {/* Close */}
                            <button
                                onClick={handleClose}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition-colors"
                                title="Close"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body — hidden when minimized */}
                    {!minimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scroll-smooth">

                                {/* Welcome state */}
                                {history.length === 0 && (
                                    <div className="text-center py-6 px-4">
                                        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                                            style={{ background: "linear-gradient(135deg,#8B5CF6,#06B6D4)" }}>
                                            <AISparkIcon size={24} />
                                        </div>
                                        <p className="text-gray-700 font-medium text-sm">Hi! I'm VitaAssist</p>
                                        <p className="text-gray-400 text-xs mt-1">
                                            Ask me anything — health, nutrition, fitness, or just chat.
                                        </p>
                                        {/* Quick prompts */}
                                        <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                                            {[
                                                "How do I build muscle?",
                                                "Best foods for energy",
                                                "Quick workout ideas",
                                                "Tips for better sleep",
                                            ].map(prompt => (
                                                <button
                                                    key={prompt}
                                                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                                                    className="text-xs px-2.5 py-1 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
                                                >
                                                    {prompt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Message bubbles */}
                                {history.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "assistant" && (
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-1.5 mt-0.5"
                                                style={{ background: "linear-gradient(135deg,#8B5CF6,#06B6D4)" }}
                                            >
                                                <AISparkIcon size={13} />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                                    ? "text-white rounded-br-sm"
                                                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                                                }`}
                                            style={
                                                msg.role === "user"
                                                    ? { background: "linear-gradient(135deg,#8B5CF6,#06B6D4)" }
                                                    : {}
                                            }
                                        >
                                            {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                                        </div>
                                    </div>
                                ))}

                                {/* Typing indicator */}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-1.5 mt-0.5"
                                            style={{ background: "linear-gradient(135deg,#8B5CF6,#06B6D4)" }}
                                        >
                                            <AISparkIcon size={13} />
                                        </div>
                                        <div className="bg-gray-100 rounded-2xl rounded-bl-sm">
                                            <TypingDots />
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 shrink-0" />

                            {/* Input row */}
                            <div className="flex items-end gap-2 px-3 py-2.5 shrink-0 bg-white">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Message VitaAssist…"
                                    rows={1}
                                    disabled={loading}
                                    className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition disabled:opacity-50"
                                    style={{ maxHeight: "100px", overflowY: "auto" }}
                                    onInput={e => {
                                        e.target.style.height = "auto";
                                        e.target.style.height = e.target.scrollHeight + "px";
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 shrink-0"
                                    style={{ background: "linear-gradient(135deg,#8B5CF6,#06B6D4)" }}
                                    title="Send (Enter)"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                </button>
                            </div>

                            {/* Footer hint */}
                            <p className="text-center text-gray-300 text-[10px] pb-2 shrink-0 select-none">
                                Enter to send · Shift+Enter for new line
                            </p>
                        </>
                    )}
                </div>
            )}
        </>
    );
}