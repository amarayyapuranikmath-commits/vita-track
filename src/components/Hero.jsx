import { Activity, Moon, Droplets, Heart, Flame } from "lucide-react";

const floatingCards = [
    {
        icon: <Activity size={16} className="text-orange" />,
        label: "AI Health Score",
        value: "94 / 100",
        color: "from-orange/20 to-orange-burnt/10",
        floatClass: "float-1",
        position: "top-10 -left-4 md:top-16 md:-left-8",
    },
    {
        icon: <Moon size={16} className="text-indigo-300" />,
        label: "Sleep Quality",
        value: "Deep · 7h 42m",
        color: "from-indigo-500/20 to-indigo-800/10",
        floatClass: "float-2",
        position: "top-1/3 -right-4 md:-right-10",
    },
    {
        icon: <Droplets size={16} className="text-sky-400" />,
        label: "Hydration Goal",
        value: "2.1L · 84%",
        color: "from-sky-500/20 to-sky-900/10",
        floatClass: "float-3",
        position: "bottom-1/3 -left-4 md:-left-10",
    },
    {
        icon: <Heart size={16} className="text-rose-400" />,
        label: "Heart Health",
        value: "72 bpm · Stable",
        color: "from-rose-500/20 to-rose-900/10",
        floatClass: "float-4",
        position: "bottom-10 -right-4 md:-right-8",
    },
    {
        icon: <Flame size={16} className="text-orange-burnt" />,
        label: "Daily Streak",
        value: "🔥 21 Days",
        color: "from-orange-burnt/20 to-orange/10",
        floatClass: "float-5",
        position: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden",
    },
];

export default function Hero() {
    return (
        <section
            id="home"
            className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden noise"
        >
            {/* Background Glow Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-orange/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-burnt/8 blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center w-full">
                {/* LEFT — Text Content */}
                <div className="slide-up">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange border border-orange/30 bg-orange/5 px-4 py-1.5 rounded-full mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
                        AI-Powered Health Intelligence
                    </span>

                    <h1 className="font-display font-black text-5xl md:text-6xl xl:text-7xl leading-[1.08] tracking-tight text-cream mb-6">
                        Be Fit.
                        <br />
                        Stay{" "}
                        <span className="gradient-text relative">
                            Strong.
                            <svg
                                className="absolute -bottom-1 left-0 w-full"
                                viewBox="0 0 200 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M2 6 Q50 2 100 5 Q150 8 198 3"
                                    stroke="#E63A1E"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    opacity="0.6"
                                />
                            </svg>
                        </span>
                        <br />
                        Live Smarter.
                    </h1>

                    <p className="text-cream/55 font-body text-base md:text-lg leading-relaxed max-w-md mb-10">
                        Track your meals, sleep, hydration, workouts, heart health, habits,
                        and progress with AI-powered health intelligence — all in one place,
                        completely free.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <button className="group flex items-center gap-2 bg-gradient-to-r from-orange to-orange-burnt text-white font-semibold px-8 py-3.5 rounded-full glow-orange hover:scale-105 transition-all duration-300 text-sm">
                            Start Free
                            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                        </button>
                        <button className="flex items-center gap-2 text-cream/70 font-medium px-8 py-3.5 rounded-full border border-cream/10 hover:border-orange/40 hover:text-orange transition-all duration-300 text-sm">
                            Explore Features
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-8 mt-12 pt-8 border-t border-white/8">
                        {[
                            { num: "2M+", label: "Active Users" },
                            { num: "98%", label: "Accuracy Rate" },
                            { num: "50+", label: "Health Metrics" },
                        ].map(({ num, label }) => (
                            <div key={label}>
                                <p className="font-display font-bold text-2xl gradient-text">{num}</p>
                                <p className="text-cream/40 text-xs font-body mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT — Visual with Floating Cards */}
                <div className="relative fade-in hidden md:flex items-center justify-center">
                    {/* Central Visual */}
                    <div className="relative w-72 h-72 xl:w-80 xl:h-80">
                        {/* Outer ring */}
                        <div className="absolute inset-0 rounded-full border border-orange/20 animate-spin" style={{ animationDuration: "20s" }} />
                        <div className="absolute inset-4 rounded-full border border-orange/10 animate-spin" style={{ animationDuration: "15s", animationDirection: "reverse" }} />

                        {/* Main circle */}
                        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-orange/25 via-orange-burnt/15 to-transparent glass flex items-center justify-center glow-orange">
                            <div className="text-center">
                                <p className="font-display font-black text-5xl gradient-text">94</p>
                                <p className="text-cream/50 text-xs font-body mt-1 tracking-widest uppercase">Health Score</p>
                                <div className="flex justify-center gap-1 mt-3">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < 4 ? "bg-orange" : "bg-orange/30"}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Floating Cards */}
                        {floatingCards.slice(0, 4).map((card) => (
                            <div
                                key={card.label}
                                className={`absolute ${card.position} ${card.floatClass}`}
                            >
                                <div className={`glass rounded-xl px-3 py-2.5 min-w-[130px] bg-gradient-to-br ${card.color} border border-white/8`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {card.icon}
                                        <span className="text-cream/50 text-[10px] font-body tracking-wide">{card.label}</span>
                                    </div>
                                    <p className="text-cream font-semibold text-xs">{card.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Streak card — bottom center */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 float-5">
                        <div className="glass rounded-xl px-4 py-2.5 bg-gradient-to-br from-orange-burnt/20 to-orange/10 border border-white/8 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <Flame size={14} className="text-orange-burnt" />
                                <span className="text-cream/50 text-[10px] tracking-wide">Daily Streak</span>
                            </div>
                            <p className="text-cream font-semibold text-xs mt-1">🔥 21 Days</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}