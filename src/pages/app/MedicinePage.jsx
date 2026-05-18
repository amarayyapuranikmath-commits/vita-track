import { useState } from "react";
import { motion } from "framer-motion";
import { Pill, Plus, Check, Trash2 } from "lucide-react";

const initialMeds = [
    { id: 1, name: "Vitamin D", dose: "1000 IU", time: "8:00 AM", taken: true },
    { id: 2, name: "Omega-3", dose: "500mg", time: "1:00 PM", taken: false },
    { id: 3, name: "Magnesium", dose: "400mg", time: "9:00 PM", taken: false },
];

export default function MedicinePage() {
    const [meds, setMeds] = useState(initialMeds);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", dose: "", time: "" });

    const toggleTaken = (id) => setMeds(meds.map((m) => m.id === id ? { ...m, taken: !m.taken } : m));
    const handleDelete = (id) => setMeds(meds.filter((m) => m.id !== id));
    const handleAdd = () => {
        if (!form.name) return;
        setMeds([...meds, { ...form, id: Date.now(), taken: false }]);
        setForm({ name: "", dose: "", time: "" });
        setShowForm(false);
    };

    const taken = meds.filter((m) => m.taken).length;

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Medicine</h1>
                    <p className="text-white/40 text-sm mt-1">Taken: <span className="text-emerald-400 font-semibold">{taken}/{meds.length}</span></p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition">
                    <Plus className="w-4 h-4" /> Add Medicine
                </button>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-3 gap-3">
                    <input placeholder="Medicine name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Dosage e.g. 500mg" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <input placeholder="Time e.g. 8:00 AM" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition" />
                    <button onClick={handleAdd}
                        className="col-span-3 bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition">
                        Save
                    </button>
                </motion.div>
            )}

            <div className="space-y-3">
                {meds.map((med, i) => (
                    <motion.div key={med.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className={`bg-white/5 border rounded-2xl p-4 flex items-center justify-between transition ${med.taken ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10"}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${med.taken ? "bg-emerald-500/20" : "bg-emerald-500/10"}`}>
                                <Pill className={`w-5 h-5 ${med.taken ? "text-emerald-400" : "text-emerald-400/50"}`} />
                            </div>
                            <div>
                                <p className={`font-medium text-sm ${med.taken ? "text-white/50 line-through" : "text-white"}`}>{med.name}</p>
                                <p className="text-white/40 text-xs mt-0.5">{med.dose} · {med.time}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => toggleTaken(med.id)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${med.taken ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-emerald-500"}`}>
                                <Check className={`w-4 h-4 ${med.taken ? "text-white" : "text-white/30"}`} />
                            </button>
                            <button onClick={() => handleDelete(med.id)} className="text-white/30 hover:text-red-400 transition">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}