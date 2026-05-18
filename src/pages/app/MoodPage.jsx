import { useState } from "react";
import { motion } from "framer-motion";
import { Smile } from "lucide-react";

const moods = [
    { emoji: "😄", label: "Great", color: "#34D399" },
    { emoji: "🙂", label: "Good", color: "#FBBF24" },
    { emoji: "😐", label: "Okay", color: "#38BDF8" },
    { emoji: "😔", label: "Bad", color: "#F97316" },
    { emoji: "😢", label: "Awful", color: "#E63A1E" },
];

export default function MoodPage() {
    const [selected, setSelected] = useState(null);
    const [note, setNote] = useState("");
    const [logs, setLogs] = useState([
        { id: 1, emoji: "😄", label: "Great", note: "Had a great workout!", time: "8:00 AM" },
        { id: 2, emoji: "🙂", label: "Good", note: "Productive day", time: "Yesterday" },
    ]);

    const handleLog = () => {
        if (!selected) return;
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLogs([{ ...selected, id: Date.now(), note, time: now }, ...logs]);
        setSelected(null);
        setNote("");
    };

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Mood Tracker</h1>
                <p className="text-white/40 text-sm mt-1">How are you feeling today?</p>
            </div>

            {/* Mood Picker */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-white/60 text-sm text-center mb-5">Select your mood</p>
                <div className="flex justify-center gap-4 mb-5">
                    {moods.map((m) => (
                        <motion.button key={m.label} whileTap={{ scale: 0.9 }} onClick={() => setSelected(m)}
                            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${selected?.label === m.label ? "border-current scale-110" : "border-white/10 bg-white/5"}`}
                            style={selected?.label === m.label ? { borderColor: m.color, background: `${m.color}20` } : {}}>
                            <span className="text-2xl">{m.emoji}</span>
                        </motion.button>
                    ))}
                </div>
                {selected && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <p className="text-center font-semibold" style={{ color: selected.color }}>{selected.label}</p>
                        <input placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                        <button onClick={handleLog}
                            className="w-full bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition">
                            Log Mood
                        </button>
                    </motion.div>
                )}
            </div>

            <div className="space-y-3">
                {logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">{log.emoji}</span>
                            <div>
                                <p className="text-white font-medium text-sm">{log.label}</p>
                                <p className="text-white/40 text-xs mt-0.5">{log.note || "No note"} · {log.time}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}