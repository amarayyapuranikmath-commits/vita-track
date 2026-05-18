import {
    Utensils,
    Moon,
    Droplets,
    Dumbbell,
    Scale,
    Heart,
    Smile,
    Bell,
} from "lucide-react";

const features = [
    {
        icon: <Utensils size={22} />,
        title: "AI Meal Tracking",
        desc: "Log meals in seconds with AI recognition. Get macro breakdowns, calorie insights, and personalised nutrition recommendations.",
        accent: "from-orange/20 to-orange/5",
        iconColor: "text-orange",
    },
    {
        icon: <Moon size={22} />,
        title: "Sleep Analysis",
        desc: "Monitor sleep cycles, quality scores, and disturbance patterns. Wake up optimised with AI-driven sleep coaching.",
        accent: "from-indigo-500/20 to-indigo-900/5",
        iconColor: "text-indigo-300",
    },
    {
        icon: <Droplets size={22} />,
        title: "Hydration Tracking",
        desc: "Set daily water goals, log intake in real-time, and receive smart reminders timed to your body's needs.",
        accent: "from-sky-500/20 to-sky-900/5",
        iconColor: "text-sky-400",
    },
    {
        icon: <Dumbbell size={22} />,
        title: "Workout Tracking",
        desc: "Log exercises, track sets and reps, monitor intensity levels, and watch your performance improve over time.",
        accent: "from-emerald-500/20 to-emerald-900/5",
        iconColor: "text-emerald-400",
    },
    {
        icon: <Scale size={22} />,
        title: "BMI Analysis",
        desc: "Track weight trends, calculate BMI, and receive tailored advice to reach and sustain your ideal body composition.",
        accent: "from-amber-500/20 to-amber-900/5",
        iconColor: "text-amber-400",
    },
    {
        icon: <Heart size={22} />,
        title: "Heart Rate Monitoring",
        desc: "Sync with wearables to track resting heart rate, HRV, and cardiovascular trends for long-term heart health.",
        accent: "from-rose-500/20 to-rose-900/5",
        iconColor: "text-rose-400",
    },
    {
        icon: <Smile size={22} />,
        title: "Mood Tracking",
        desc: "Log daily moods, identify emotional patterns, and discover how lifestyle habits influence your mental wellbeing.",
        accent: "from-purple-500/20 to-purple-900/5",
        iconColor: "text-purple-400",
    },
    {
        icon: <Bell size={22} />,
        title: "Medicine Reminder",
        desc: "Never miss a dose. Set smart medication reminders with dosage logs and adherence tracking built right in.",
        accent: "from-teal-500/20 to-teal-900/5",
        iconColor: "text-teal-400",
    },
];

export default function Features() {
    return (
        <section id="features" className="py-24 relative overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-orange/40" />

            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange/80 mb-4">
                        Everything You Need
                    </span>
                    <h2 className="font-display font-black text-4xl md:text-5xl text-cream leading-tight">
                        8 Powerful Health{" "}
                        <span className="gradient-text">Modules</span>
                    </h2>
                    <p className="text-cream/45 font-body text-base mt-4 max-w-xl mx-auto leading-relaxed">
                        One unified platform replacing eight separate apps — beautifully
                        integrated and intelligently connected.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((f, i) => (
                        <div
                            key={f.title}
                            className={`group relative glass rounded-2xl p-6 bg-gradient-to-br ${f.accent} hover:scale-[1.02] transition-all duration-300 cursor-default border border-white/5 hover:border-white/10`}
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            {/* Icon */}
                            <div className={`${f.iconColor} mb-4 opacity-90 group-hover:opacity-100 transition-opacity`}>
                                {f.icon}
                            </div>

                            <h3 className="font-display font-bold text-cream text-base mb-2">
                                {f.title}
                            </h3>
                            <p className="text-cream/45 text-sm font-body leading-relaxed">
                                {f.desc}
                            </p>

                            {/* Hover arrow */}
                            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                                <span className={`text-sm ${f.iconColor}`}>→</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}