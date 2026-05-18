import { useState } from "react";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";

function calcBMI(weight, height) {
    const h = height / 100;
    return (weight / (h * h)).toFixed(1);
}

function getCategory(bmi) {
    if (bmi < 18.5) return { label: "Underweight", color: "#38BDF8" };
    if (bmi < 25) return { label: "Normal", color: "#34D399" };
    if (bmi < 30) return { label: "Overweight", color: "#FBBF24" };
    return { label: "Obese", color: "#E63A1E" };
}

export default function BMIPage() {
    const [weight, setWeight] = useState(70);
    const [height, setHeight] = useState(175);
    const bmi = calcBMI(weight, height);
    const category = getCategory(Number(bmi));

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>BMI Calculator</h1>
                <p className="text-white/40 text-sm mt-1">Track your Body Mass Index</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-6">
                {/* BMI Display */}
                <motion.div
                    key={bmi}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center"
                    style={{ borderColor: category.color, boxShadow: `0 0 40px ${category.color}40` }}
                >
                    <Scale className="w-6 h-6 mb-1" style={{ color: category.color }} />
                    <p className="text-white text-3xl font-bold">{bmi}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: category.color }}>{category.label}</p>
                </motion.div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div>
                        <label className="text-white/40 text-xs mb-2 block">Weight (kg)</label>
                        <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition text-center font-bold" />
                    </div>
                    <div>
                        <label className="text-white/40 text-xs mb-2 block">Height (cm)</label>
                        <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E63A1E]/60 transition text-center font-bold" />
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Underweight", range: "< 18.5", color: "#38BDF8" },
                    { label: "Normal", range: "18.5–24.9", color: "#34D399" },
                    { label: "Overweight", range: "25–29.9", color: "#FBBF24" },
                    { label: "Obese", range: "≥ 30", color: "#E63A1E" },
                ].map((c) => (
                    <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
                        style={{ borderColor: category.label === c.label ? c.color : undefined, background: category.label === c.label ? `${c.color}15` : undefined }}>
                        <p className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</p>
                        <p className="text-white/40 text-[10px] mt-0.5">{c.range}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}