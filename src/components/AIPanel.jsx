import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAI } from "../context/AIContext";

const quickPrompts = [
    "Give me a diet plan",
    "Create workout plan",
    "Analyze my sleep",
    "Weight loss tips",
    "Muscle gain plan",
    "Stress relief tips",
];

export default function AIPanel() {
    const { messages, isTyping, sendMessage } = useAI();
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input.trim());
        setInput("");
    };

    return (
        <aside className="w-[280px] min-w-[280px] border-l border-white/10 bg-white/[0.02] flex flex-col">
            {/* Header */}
            <div className="px-4 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#E63A1E] to-[#FF7A00] rounded-xl flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-semibold text-sm" style={{ fontFamily: "Playfair Display, serif" }}>Ask VitaAI</p>
                        <p className="text-green-400 text-xs flex items-center gap-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === "user"
                                        ? "bg-gradient-to-br from-[#E63A1E] to-[#FF7A00] text-white rounded-br-sm"
                                        : "bg-white/8 border border-white/10 text-white/80 rounded-bl-sm"
                                    }`}
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-white/8 border border-white/10 px-3 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 h-1.5 bg-[#FF7A00] rounded-full"
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {quickPrompts.map((p) => (
                    <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-[10px] bg-white/5 border border-white/10 text-white/50 hover:text-[#FF7A00] hover:border-[#FF7A00]/30 px-2 py-1 rounded-lg transition-all"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#E63A1E]/40 transition-all">
                    <Sparkles className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask anything about your health..."
                        className="flex-1 bg-transparent text-white placeholder-white/30 text-xs outline-none"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                    <button
                        onClick={handleSend}
                        className="w-6 h-6 bg-gradient-to-br from-[#E63A1E] to-[#FF7A00] rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-80 transition"
                    >
                        <Send className="w-3 h-3 text-white" />
                    </button>
                </div>
            </div>
        </aside>
    );
}