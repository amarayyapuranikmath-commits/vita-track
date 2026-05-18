import { useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Plus, Trash2, Edit2 } from "lucide-react";

const initialMeals = [
    { id: 1, name: "Oatmeal with berries", calories: 320, time: "8:00 AM", type: "Breakfast" },
    { id: 2, name: "Grilled chicken salad", calories: 480, time: "1:00 PM", type: "Lunch" },
    { id: 3, name: "Protein shake", calories: 220, time: "5:00 PM", type: "Snack" },
];

export default function MealsPage() {
    const [meals, setMeals] = useState(initialMeals);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", calories: "", time: "", type: "Breakfast" });

    const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0);

    const handleAdd = () => {
        if (!form.name || !form.calories) return;
        setMeals([...meals, { ...form, id: Date.now(), calories: Number(form.calories) }]);
        setForm({ name: "", calories: "", time: "", type: "Breakfast" });
        setShowForm(false);
    };

    const handleDelete = (id) => setMeals(meals.filter((m) => m.id !== id));

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Meals</h1>
                    <p className="text-white/40 text-sm mt-1">Total today: <span className="text-[#FF7A00] font-semibold">{totalCalories} kcal</span></p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition"
                >
                    <Plus className="w-4 h-4" /> Add Meal
                </button>
            </div>

            {/* Add Form */}
            {showForm && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-2 gap-3"
                >
                    <input placeholder="Meal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="col-span-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Calories" type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Time (e.g. 8:00 AM)" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none">
                        {["Breakfast", "Lunch", "Dinner", "Snack"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <button onClick={handleAdd}
                        className="bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition">
                        Save Meal
                    </button>
                </motion.div>
            )}

            {/* Meal List */}
            <div className="space-y-3">
                {meals.map((meal, i) => (
                    <motion.div
                        key={meal.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:border-white/20 transition"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#E63A1E]/15 rounded-xl flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-[#E63A1E]" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{meal.name}</p>
                                <p className="text-white/40 text-xs mt-0.5">{meal.type} · {meal.time}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[#FF7A00] font-semibold text-sm">{meal.calories} kcal</span>
                            <button onClick={() => handleDelete(meal.id)} className="text-white/30 hover:text-red-400 transition">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}