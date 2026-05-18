import { useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Plus, Trash2, Timer, Flame } from "lucide-react";

const initialWorkouts = [
    { id: 1, name: "Morning Run", type: "Cardio", duration: 30, calories: 280, date: "Today" },
    { id: 2, name: "Push Ups", type: "Strength", duration: 20, calories: 150, date: "Today" },
    { id: 3, name: "Yoga", type: "Flexibility", duration: 45, calories: 120, date: "Yesterday" },
];

const typeColors = { Cardio: "#E63A1E", Strength: "#FF7A00", Flexibility: "#A78BFA", HIIT: "#38BDF8" };

export default function WorkoutPage() {
    const [workouts, setWorkouts] = useState(initialWorkouts);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", type: "Cardio", duration: "", calories: "" });

    const totalCal = workouts.filter((w) => w.date === "Today").reduce((s, w) => s + w.calories, 0);

    const handleAdd = () => {
        if (!form.name || !form.duration) return;
        setWorkouts([{ ...form, id: Date.now(), date: "Today", duration: Number(form.duration), calories: Number(form.calories) || 0 }, ...workouts]);
        setForm({ name: "", type: "Cardio", duration: "", calories: "" });
        setShowForm(false);
    };

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Workout</h1>
                    <p className="text-white/40 text-sm mt-1">Burned today: <span className="text-[#FF7A00] font-semibold">{totalCal} kcal</span></p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition">
                    <Plus className="w-4 h-4" /> Log Workout
                </button>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-2 gap-3">
                    <input placeholder="Workout name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="col-span-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none">
                        {["Cardio", "Strength", "Flexibility", "HIIT"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <input placeholder="Duration (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Calories burned" type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <button onClick={handleAdd}
                        className="bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition">
                        Save Workout
                    </button>
                </motion.div>
            )}

            <div className="space-y-3">
                {workouts.map((w, i) => (
                    <motion.div key={w.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${typeColors[w.type]}22` }}>
                                <Dumbbell className="w-5 h-5" style={{ color: typeColors[w.type] }} />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{w.name}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-white/40 text-xs flex items-center gap-1"><Timer className="w-3 h-3" />{w.duration} min</span>
                                    <span className="text-white/40 text-xs flex items-center gap-1"><Flame className="w-3 h-3" />{w.calories} kcal</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${typeColors[w.type]}22`, color: typeColors[w.type] }}>{w.type}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setWorkouts(workouts.filter((x) => x.id !== w.id))} className="text-white/30 hover:text-red-400 transition">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}