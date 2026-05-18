import { useState } from "react";
import { motion } from "framer-motion";
import { Droplets, Plus } from "lucide-react";

const GOAL = 3000;
const amounts = [150, 250, 350, 500];

export default function WaterPage() {
    const [total, setTotal] = useState(1800);
    const [logs, setLogs] = useState([
        { id: 1, amount: 500, time: "8:00 AM" },
        { id: 2, amount: 350, time: "10:30 AM" },
        { id: 3, amount: 250, time: "1:00 PM" },
        { id: 4, amount: 700, time: "4:00 PM" },
    ]);

    const percentage = Math.min((total / GOAL) * 100, 100).toFixed(0);

    const addWater = (amount) => {
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLogs([{ id: Date.now(), amount, time: now }, ...logs]);
        setTotal((t) => t + amount);
    };

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Water Intake</h1>
                <p className="text-white/40 text-sm mt-1">Daily goal: <span className="text-sky-400 font-semibold">3,000 ml</span></p>
            </div>

            {/* Progress Circle */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center">
                <div className="relative w-48 h-48">
                    <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#38BDF8" strokeWidth="8"
                            strokeDasharray={`${percentage * 2.51} 251`} strokeLinecap="round" className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Droplets className="w-8 h-8 text-sky-400 mb-1" />
                        <p className="text-white text-2xl font-bold">{(total / 1000).toFixed(1)}L</p>
                        <p className="text-white/40 text-xs">{percentage}% of goal</p>
                    </div>
                </div>

                {/* Quick add buttons */}
                <div className="flex gap-3 mt-6">
                    {amounts.map((a) => (
                        <button key={a} onClick={() => addWater(a)}
                            className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-500/20 transition">
                            <Plus className="w-3.5 h-3.5" /> {a}ml
                        </button>
                    ))}
                </div>
            </div>

            {/* Log */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <h3 className="text-white font-semibold text-sm" style={{ fontFamily: "Playfair Display, serif" }}>Today's Log</h3>
                {logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                            <Droplets className="w-4 h-4 text-sky-400" />
                            <span className="text-white/70 text-sm">{log.amount} ml</span>
                        </div>
                        <span className="text-white/30 text-xs">{log.time}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}