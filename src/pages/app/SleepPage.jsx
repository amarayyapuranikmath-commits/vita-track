import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const initialLogs = [
    { id: 1, date: "Today", bedtime: "10:30 PM", wakeup: "6:30 AM", hours: 8, quality: "Great" },
    { id: 2, date: "Yesterday", bedtime: "11:00 PM", wakeup: "6:45 AM", hours: 7.75, quality: "Good" },
    { id: 3, date: "2 days ago", bedtime: "12:00 AM", wakeup: "7:00 AM", hours: 7, quality: "Fair" },
];

const chartData = [
    { day: "Mon", hours: 7 }, { day: "Tue", hours: 6.5 }, { day: "Wed", hours: 8 },
    { day: "Thu", hours: 7.2 }, { day: "Fri", hours: 6.8 }, { day: "Sat", hours: 9 }, { day: "Sun", hours: 7.5 },
];

export default function SleepPage() {
    const [logs, setLogs] = useState(initialLogs);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ bedtime: "", wakeup: "", quality: "Good" });

    const avgSleep = (logs.reduce((s, l) => s + l.hours, 0) / logs.length).toFixed(1);

    const handleAdd = () => {
        if (!form.bedtime || !form.wakeup) return;
        setLogs([{ ...form, id: Date.now(), date: "Today", hours: 7 }, ...logs]);
        setForm({ bedtime: "", wakeup: "", quality: "Good" });
        setShowForm(false);
    };

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Sleep</h1>
                    <p className="text-white/40 text-sm mt-1">Avg this week: <span className="text-violet-400 font-semibold">{avgSleep} hrs</span></p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition">
                    <Plus className="w-4 h-4" /> Log Sleep
                </button>
            </div>

            {/* Chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 text-sm" style={{ fontFamily: "Playfair Display, serif" }}>Weekly Sleep</h3>
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} domain={[0, 10]} />
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", fontSize: 12 }} />
                        <Bar dataKey="hours" fill="#A78BFA" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-3 gap-3">
                    <input placeholder="Bedtime e.g. 10:30 PM" value={form.bedtime} onChange={(e) => setForm({ ...form, bedtime: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Wake up e.g. 6:30 AM" value={form.wakeup} onChange={(e) => setForm({ ...form, wakeup: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <select value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })}
                        className="bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none">
                        {["Poor", "Fair", "Good", "Great"].map((q) => <option key={q}>{q}</option>)}
                    </select>
                    <button onClick={handleAdd}
                        className="col-span-3 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition">
                        Save Sleep Log
                    </button>
                </motion.div>
            )}

            <div className="space-y-3">
                {logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-violet-500/15 rounded-xl flex items-center justify-center">
                                <Moon className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{log.date} — {log.hours} hrs</p>
                                <p className="text-white/40 text-xs mt-0.5">{log.bedtime} → {log.wakeup} · {log.quality}</p>
                            </div>
                        </div>
                        <button onClick={() => setLogs(logs.filter((l) => l.id !== log.id))} className="text-white/30 hover:text-red-400 transition">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}