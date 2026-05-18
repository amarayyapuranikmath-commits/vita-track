import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
    { time: "6AM", bpm: 62 }, { time: "9AM", bpm: 78 }, { time: "12PM", bpm: 85 },
    { time: "3PM", bpm: 72 }, { time: "6PM", bpm: 90 }, { time: "9PM", bpm: 68 },
];

export default function HeartPage() {
    const [logs, setLogs] = useState([
        { id: 1, bpm: 72, note: "Resting", time: "8:00 AM" },
        { id: 2, bpm: 145, note: "During workout", time: "11:00 AM" },
        { id: 3, bpm: 68, note: "After rest", time: "12:30 PM" },
    ]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ bpm: "", note: "" });

    const handleAdd = () => {
        if (!form.bpm) return;
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLogs([{ ...form, id: Date.now(), time: now, bpm: Number(form.bpm) }, ...logs]);
        setForm({ bpm: "", note: "" });
        setShowForm(false);
    };

    const avg = Math.round(logs.reduce((s, l) => s + l.bpm, 0) / logs.length);

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Heart Health</h1>
                    <p className="text-white/40 text-sm mt-1">Avg BPM today: <span className="text-pink-400 font-semibold">{avg} bpm</span></p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition">
                    <Plus className="w-4 h-4" /> Log Reading
                </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 text-sm" style={{ fontFamily: "Playfair Display, serif" }}>Heart Rate Today</h3>
                <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} domain={[50, 160]} />
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", fontSize: 12 }} />
                        <Line type="monotone" dataKey="bpm" stroke="#F472B6" strokeWidth={2.5} dot={{ fill: "#F472B6", r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-2 gap-3">
                    <input placeholder="BPM" type="number" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Note (e.g. Resting)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <button onClick={handleAdd}
                        className="col-span-2 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition">
                        Save Reading
                    </button>
                </motion.div>
            )}

            <div className="space-y-3">
                {logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-pink-500/15 rounded-xl flex items-center justify-center">
                                <Heart className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{log.bpm} bpm</p>
                                <p className="text-white/40 text-xs mt-0.5">{log.note} · {log.time}</p>
                            </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${log.bpm < 100 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                            {log.bpm < 100 ? "Normal" : "Elevated"}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}