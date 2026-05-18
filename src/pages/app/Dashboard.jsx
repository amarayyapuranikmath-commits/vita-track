import { useState, useEffect, useId } from "react";
import { motion } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Flame, Zap, Target, Footprints, Droplets,
    Dumbbell, Clock, TrendingUp, Brain, Heart,
    Star, ChevronRight, Activity, Apple, Moon,
    Scale, Pill, Smile, FileText,
} from "lucide-react";
import api from "../../api/axios";

// ─── Icon map for activity feed (backend sends icon name as string) ────────
const ICON_MAP = {
    Apple, Droplets, Moon, Dumbbell, Footprints,
    Scale, Pill, Smile, FileText, Flame, Zap,
};

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1.4, decimals = 0 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!value && value !== 0) return;
        let current = 0;
        const steps = 60;
        const inc = value / steps;
        const ms = (duration * 1000) / steps;
        const timer = setInterval(() => {
            current += inc;
            if (current >= value) { setDisplay(value); clearInterval(timer); }
            else setDisplay(parseFloat(current.toFixed(decimals)));
        }, ms);
        return () => clearInterval(timer);
    }, [value, duration, decimals]);
    return <span>{display.toLocaleString()}</span>;
}

// ─── Circular Progress ─────────────────────────────────────────────────────
function CircularProgress({ value, size = 100, stroke = 8, color = "#FF6B00", trackColor = "#F1F5F9", children }) {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(value, 100) / 100) * circ;
    const cx = size / 2;
    const cy = size / 2;
    return (
        <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }} overflow="visible">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
                <motion.circle
                    cx={cx} cy={cy} r={r} fill="none"
                    stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
                />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {children}
            </div>
        </div>
    );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-3 py-2 z-50">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

// ─── Card ────────────────────────────────────────────────────────────────
function Card({ children, className = "", hover = true, style = {} }) {
    return (
        <motion.div
            whileHover={hover ? { y: -2, boxShadow: "0 20px 50px rgba(0,0,0,0.09)" } : {}}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
            style={style}
        >
            {children}
        </motion.div>
    );
}

function SectionLabel({ children }) {
    return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">{children}</p>;
}

// ─── Skeleton loader ──────────────────────────────────────────────────────
function Skeleton({ className = "", style = {} }) {
    return (
        <div
            className={`animate-pulse bg-gray-100 rounded-xl ${className}`}
            style={style}
        />
    );
}

const chartTabs = [
    { key: "Calories", label: "Calories", color: "#FF6B00" },
    { key: "Water", label: "Water", color: "#06B6D4" },
    { key: "Steps", label: "Steps", color: "#22C55E" },
    { key: "Protein", label: "Protein", color: "#8B5CF6" },
    { key: "Workout", label: "Workout", color: "#EC4899" },
    { key: "BMI", label: "BMI", color: "#22C55E" },
];

// getBMIStyle maps bmi value → ring color + label style (used by BMI card)
function getBMIStyle(bmi) {
    if (!bmi) return { color: "#6B7280", track: "#F3F4F6", label: "No data" };
    if (bmi < 18.5) return { color: "#06B6D4", track: "#E0F9FD", label: "Underweight" };
    if (bmi < 25) return { color: "#22C55E", track: "#DCFCE7", label: "Healthy" };
    if (bmi < 30) return { color: "#F59E0B", track: "#FEF9C3", label: "Overweight" };
    return { color: "#EF4444", track: "#FEE2E2", label: "Obese" };
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } } };

// ─── DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const [activeChart, setActiveChart] = useState("Calories");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const uid = useId().replace(/:/g, "");

    // ── Fetch real dashboard data ─────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.get("/api/dashboard")
            .then((res) => { if (!cancelled) { setData(res.data); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // ── Derived values (all from API, no fallback statics) ────────────────
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const firstName = data?.first_name ?? "";
    const healthScore = data?.health_score ?? 0;
    const streakDays = data?.streak ?? 0;
    const goalComp = data?.goal_completion ?? { met: 0, total: 0, pct: 0 };
    const metrics = data?.metrics ?? {};
    const todayProgress = data?.today_progress ?? [];
    const bodyGoal = data?.body_goal ?? {};
    const weeklyChart = data?.weekly_chart ?? [];
    const recentActivity = data?.recent_activity ?? [];
    const activityStats = data?.activity_stats ?? {};
    const achievements = data?.achievements ?? [];

    // BMI — sourced from backend bmi object (profile height + latest weight log)
    const bmiData = data?.bmi ?? {};
    const bmiValue = bmiData.value ?? null;           // e.g. 24.1
    const bmiStyle = getBMIStyle(bmiValue);           // color, track, label
    // Display height as profile string e.g. "5'8"" built from bmiData.height_m
    const heightRaw = data?.bmi?.height_m;
    const weightRaw = bmiData.weight_kg;

    const activeColor = chartTabs.find((t) => t.key === activeChart)?.color ?? "#FF6B00";

    // ── Metric cards config (shape matches backend metrics object) ─────────
    const metricCards = [
        {
            label: "Calories",
            value: metrics.calories?.value ?? 0,
            target: metrics.calories?.goal ?? 0,
            unit: "kcal",
            icon: Flame,
            color: "#FF6B00",
            bg: "#FFF7ED",
            bar: "#FF6B00",
            pct: metrics.calories?.pct ?? 0,
            decimals: 0,
        },
        {
            label: "Water",
            value: metrics.water?.value ?? 0,
            target: metrics.water?.goal ?? 0,
            unit: "L",
            icon: Droplets,
            color: "#06B6D4",
            bg: "#ECFEFF",
            bar: "#06B6D4",
            pct: metrics.water?.pct ?? 0,
            decimals: 1,
        },
        {
            label: "Steps",
            value: metrics.steps?.value ?? 0,
            target: metrics.steps?.goal ?? 0,
            unit: "steps",
            icon: Footprints,
            color: "#22C55E",
            bg: "#F0FDF4",
            bar: "#22C55E",
            pct: metrics.steps?.pct ?? 0,
            decimals: 0,
        },
        {
            label: "Sleep",
            value: metrics.sleep?.value ?? 0,
            target: metrics.sleep?.goal ?? 0,
            unit: "hrs",
            icon: Moon,
            color: "#8B5CF6",
            bg: "#F5F3FF",
            bar: "#8B5CF6",
            pct: metrics.sleep?.pct ?? 0,
            decimals: 1,
        },
    ];

    // ── Goal completion label ──────────────────────────────────────────────
    const goalLabel = goalComp.total > 0
        ? `${goalComp.met} of ${goalComp.total} goals`
        : "No goals set";
    const goalPaceBadge = goalComp.pct >= 80 ? "Great pace ✓"
        : goalComp.pct >= 50 ? "On track 👍"
            : "Keep going 💪";

    return (
        <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 py-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── GREETING ── */}
            <motion.div variants={stagger} initial="hidden" animate="show"
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
            >
                <motion.div variants={fadeUp}>
                    <p className="text-sm text-gray-400 font-medium mb-1">
                        {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        {greeting},{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] to-[#FFB347]">
                            {loading ? "…" : firstName} 👋
                        </span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Here's your health overview for today</p>
                </motion.div>
                <motion.div variants={fadeUp}>
                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm w-fit">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                        </span>
                        <span className="text-xs font-semibold text-gray-600">AI Monitoring Active</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* ── ROW 1: 4 top cards ── */}
            <motion.div variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5"
            >
                {/* Health Score */}
                <motion.div variants={fadeUp}>
                    <Card className="p-5 border-0 text-white relative overflow-hidden"
                        style={{ background: "linear-gradient(135deg,#FF6B00 0%,#FFB347 100%)", minHeight: 185 }}>
                        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 -translate-y-8 translate-x-8 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-black/8 translate-y-6 -translate-x-6 pointer-events-none" />
                        <div className="relative z-10">
                            <SectionLabel>Health Score</SectionLabel>
                            <div className="flex items-end gap-1.5 mt-3 mb-2">
                                {loading ? (
                                    <Skeleton className="w-20 h-12 bg-white/20" />
                                ) : (
                                    <span className="text-5xl font-black text-white leading-none"
                                        style={{ fontFamily: "'Playfair Display', serif" }}>
                                        <AnimatedCounter value={healthScore} />
                                    </span>
                                )}
                                <span className="text-white/60 text-sm mb-1">/100</span>
                            </div>
                            <div className="w-full bg-white/25 rounded-full mb-3" style={{ height: 6 }}>
                                <motion.div className="h-full rounded-full bg-white"
                                    initial={{ width: 0 }} animate={{ width: `${healthScore}%` }}
                                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }} />
                            </div>
                            <p className="text-xs text-white/75 flex items-center gap-1">
                                <TrendingUp size={11} /> Based on today's logs
                            </p>
                        </div>
                    </Card>
                </motion.div>

                {/* BMI */}
                <motion.div variants={fadeUp}>
                    <Card className="p-5 relative" style={{ minHeight: 185 }}>
                        <div className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{ background: `${bmiStyle.color}08` }} />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: bmiStyle.color + "22" }}>
                                    <Scale size={14} style={{ color: bmiStyle.color }} />
                                </div>
                                <SectionLabel>BMI</SectionLabel>
                            </div>
                            <div className="flex items-center gap-4 flex-1">
                                {loading ? (
                                    <Skeleton style={{ width: 88, height: 88, borderRadius: "50%" }} />
                                ) : (
                                    <CircularProgress
                                        value={bmiValue ? Math.min(((bmiValue - 10) / 30) * 100, 100) : 0}
                                        size={88} stroke={8}
                                        color={bmiStyle.color} trackColor={bmiStyle.track}>
                                        <span className="text-base font-black text-gray-900"
                                            style={{ fontFamily: "'Playfair Display', serif" }}>
                                            {bmiValue ?? "—"}
                                        </span>
                                    </CircularProgress>
                                )}
                                <div>
                                    <p className="text-3xl font-black text-gray-900 leading-none mb-2"
                                        style={{ fontFamily: "'Playfair Display', serif" }}>
                                        {bmiValue ?? "—"}
                                    </p>
                                    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2"
                                        style={{ background: bmiStyle.color + "18", color: bmiStyle.color }}>
                                        {bmiStyle.label}
                                    </span>
                                    {weightRaw && (
                                        <p className="text-[10px] text-gray-400 leading-tight">
                                            {weightRaw} kg · {heightRaw ? `${(heightRaw * 100).toFixed(0)} cm` : ""}
                                        </p>
                                    )}
                                    {!bmiValue && !loading && (
                                        <p className="text-[10px] text-gray-400 leading-tight">
                                            Log weight &amp; set height in Profile
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Daily Streak */}
                <motion.div variants={fadeUp}>
                    <Card className="p-5 relative border-amber-100"
                        style={{ background: "linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)", minHeight: 185 }}>
                        <div className="absolute top-3 right-3 select-none pointer-events-none"
                            style={{ fontSize: 48, opacity: 0.15, lineHeight: 1 }}>🔥</div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                                    <Flame size={14} className="text-orange-500" />
                                </div>
                                <SectionLabel>Daily Streak</SectionLabel>
                            </div>
                            <div className="flex items-end gap-1 mb-1">
                                {loading ? (
                                    <Skeleton className="w-16 h-12" />
                                ) : (
                                    <span className="text-5xl font-black text-gray-900 leading-none"
                                        style={{ fontFamily: "'Playfair Display', serif" }}>
                                        <AnimatedCounter value={streakDays} />
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-amber-600 mb-4">
                                {streakDays === 0 ? "Start your streak today!" : "Days on fire 🔥"}
                            </p>
                            <div className="flex gap-1 mt-auto">
                                {[...Array(7)].map((_, i) => (
                                    <motion.div key={i} className="flex-1 rounded-full"
                                        style={{ height: 6, background: i < Math.min(streakDays, 7) ? "#F97316" : "#FED7AA" }}
                                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                                        transition={{ delay: 0.6 + i * 0.06, duration: 0.3 }} />
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">Last 7 days active</p>
                        </div>
                    </Card>
                </motion.div>

                {/* Goal Completion Ring */}
                <motion.div variants={fadeUp}>
                    <Card className="p-5" style={{ minHeight: 185 }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                <Target size={14} className="text-purple-500" />
                            </div>
                            <SectionLabel>Goal Completion</SectionLabel>
                        </div>
                        <div className="flex items-center gap-4">
                            {loading ? (
                                <Skeleton style={{ width: 88, height: 88, borderRadius: "50%" }} />
                            ) : (
                                <CircularProgress value={goalComp.pct} size={88} stroke={9} color="#8B5CF6" trackColor="#EDE9FE">
                                    <span className="text-lg font-black text-gray-900"
                                        style={{ fontFamily: "'Playfair Display', serif" }}>
                                        <AnimatedCounter value={goalComp.pct} />%
                                    </span>
                                </CircularProgress>
                            )}
                            <div>
                                <p className="text-sm font-bold text-gray-800 mb-1">{goalLabel}</p>
                                <p className="text-xs text-gray-400 mb-3">met today</p>
                                <span className="inline-block text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                                    {goalPaceBadge}
                                </span>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* ── ROW 2: Metric Cards ── */}
            <motion.div variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5"
            >
                {metricCards.map(({ label, value, target, unit, icon: Icon, color, bg, bar, pct, decimals }) => (
                    <motion.div key={label} variants={fadeUp}>
                        <Card className="p-5" style={{ background: bg }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: color + "22" }}>
                                    <Icon size={18} style={{ color }} />
                                </div>
                                {loading ? (
                                    <Skeleton className="w-8 h-4" />
                                ) : (
                                    <span className="text-xs font-black" style={{ color }}>{pct}%</span>
                                )}
                            </div>
                            {loading ? (
                                <Skeleton className="w-24 h-7 mb-1" />
                            ) : (
                                <p className="text-2xl font-black text-gray-900 leading-none mb-0.5"
                                    style={{ fontFamily: "'Playfair Display', serif" }}>
                                    <AnimatedCounter value={value} decimals={decimals} />
                                    <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mb-3">
                                {label}{target > 0 ? ` · Goal: ${target} ${unit}` : " · No goal set"}
                            </p>
                            <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "rgba(0,0,0,0.07)" }}>
                                <motion.div className="h-full rounded-full"
                                    style={{ background: `linear-gradient(90deg,${bar},${bar}bb)` }}
                                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                    transition={{ duration: 1.3, ease: "easeOut", delay: 0.3 }} />
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* ── ROW 3: Today's Progress + Body Goal Tracker ── */}
            <motion.div variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5"
            >
                {/* Today's Progress */}
                <motion.div variants={fadeUp}>
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900"
                                    style={{ fontFamily: "'Playfair Display', serif" }}>Today's Progress</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Live tracking · updated now</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                <Activity size={15} className="text-orange-500" />
                            </div>
                        </div>
                        <div className="space-y-5">
                            {loading ? (
                                [...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-10" />)
                            ) : (
                                <>
                                    {/* Always show the 4 progress bars — backend returns goals even with 0 logged */}
                                    {todayProgress.map(({ label, value, max, color, unit, pct: itemPct }) => {
                                        const pct = itemPct ?? (max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0);
                                        const IconComp = label === "Steps" ? Footprints
                                            : label === "Protein" ? Zap
                                                : label === "Water" ? Droplets
                                                    : Clock;
                                        return (
                                            <div key={label}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{ background: color + "22" }}>
                                                            <IconComp size={12} style={{ color }} />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-700">{label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-black text-gray-900">
                                                            {value.toLocaleString()}{unit}
                                                        </span>
                                                        {max > 0 && <span className="text-xs text-gray-400">/ {max.toLocaleString()}{unit}</span>}
                                                        <span className="text-xs font-black w-8 text-right" style={{ color }}>{pct}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-full rounded-full overflow-hidden"
                                                    style={{ background: "#F1F5F9", height: 8 }}>
                                                    <motion.div className="h-full rounded-full"
                                                        style={{ background: `linear-gradient(90deg,${color},${color}99)` }}
                                                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Hint shown only when nothing has been logged today */}
                                    {todayProgress.every(item => item.value === 0) && (
                                        <p className="text-xs text-gray-400 text-center pt-1">
                                            Start logging to track your progress 💪
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>

                {/* Body Goal Tracker */}
                <motion.div variants={fadeUp}>
                    <Card className="p-6 relative">
                        <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none"
                            style={{
                                background: "radial-gradient(circle,#EDE9FE 0%,transparent 70%)",
                                transform: "translate(30%,-30%)", zIndex: 0
                            }} />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900"
                                        style={{ fontFamily: "'Playfair Display', serif" }}>Body Goal Tracker</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Weight transformation progress</p>
                                </div>
                                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                    <Target size={15} className="text-purple-500" />
                                </div>
                            </div>

                            {loading ? (
                                <div className="space-y-3">
                                    <Skeleton className="w-full h-6" />
                                    <Skeleton className="w-full h-5" />
                                    <div className="grid grid-cols-3 gap-3">
                                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                                    </div>
                                </div>
                            ) : !bodyGoal.current_weight ? (
                                <div className="py-6 text-center">
                                    <p className="text-sm text-gray-400">Log your weight to start tracking</p>
                                </div>
                            ) : (
                                <>
                                    {/* Slider */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                                            <span>Start</span>
                                            <span className="font-semibold text-purple-600">
                                                Current · {bodyGoal.current_weight} kg
                                            </span>
                                            <span>Goal</span>
                                        </div>
                                        <div className="relative" style={{ height: 20 }}>
                                            <div className="absolute rounded-full" style={{
                                                left: 0, right: 0, top: "50%", transform: "translateY(-50%)",
                                                height: 8, background: "#F1F5F9",
                                            }} />
                                            <motion.div className="absolute rounded-full" style={{
                                                left: 0, top: "50%", transform: "translateY(-50%)",
                                                height: 8, background: "linear-gradient(90deg,#8B5CF6,#A78BFA)",
                                            }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${bodyGoal.complete_pct ?? 0}%` }}
                                                transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }} />
                                            <motion.div style={{
                                                position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
                                                width: 20, height: 20, borderRadius: "50%",
                                                background: "white", border: "2.5px solid #8B5CF6",
                                                boxShadow: "0 2px 8px rgba(139,92,246,0.4)", zIndex: 10,
                                            }}
                                                initial={{ left: "0%" }}
                                                animate={{ left: `${bodyGoal.complete_pct ?? 0}%` }}
                                                transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }} />
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold mt-2">
                                            <span className="text-gray-500">{bodyGoal.start_weight} kg</span>
                                            <span className="text-gray-500">{bodyGoal.goal_weight ?? "–"} kg</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        {[
                                            { label: "Lost", value: `${bodyGoal.lost ?? 0} kg`, color: "#22C55E", bg: "#F0FDF4" },
                                            { label: "Remaining", value: `${bodyGoal.remaining ?? 0} kg`, color: "#8B5CF6", bg: "#F5F3FF" },
                                            { label: "Complete", value: `${bodyGoal.complete_pct ?? 0}%`, color: "#FF6B00", bg: "#FFF7ED" },
                                        ].map(({ label, value, color, bg }) => (
                                            <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
                                                <p className="text-sm font-black leading-none mb-1"
                                                    style={{ color, fontFamily: "'Playfair Display', serif" }}>{value}</p>
                                                <p className="text-[10px] text-gray-400">{label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: "#F5F3FF" }}>
                                        <Brain size={14} className="text-purple-500 shrink-0" />
                                        <p className="text-xs text-purple-700 font-medium leading-relaxed">
                                            {bodyGoal.complete_pct > 0
                                                ? `${bodyGoal.complete_pct}% of the way to your goal weight.`
                                                : "Start logging weight to track your progress."}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* ── ROW 4: Weekly Chart ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }} className="mb-5">
                <Card className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-bold text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}>Weekly Overview</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Last 7 days performance</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {chartTabs.map(({ key, label, color }) => (
                                <button key={key} onClick={() => setActiveChart(key)}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
                                    style={activeChart === key
                                        ? { background: color + "20", color, border: `1px solid ${color}40` }
                                        : { background: "#F1F5F9", color: "#9CA3AF", border: "1px solid transparent" }
                                    }>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: 200 }}>
                        {loading ? (
                            <Skeleton className="w-full h-full" />
                        ) : weeklyChart.every(row => (row[activeChart] ?? 0) === 0) ? (
                            /* Empty state — chart would be blank with all-zero data */
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: activeColor + "18" }}>
                                    <TrendingUp size={18} style={{ color: activeColor }} />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">No {activeChart.toLowerCase()} data yet</p>
                                <p className="text-xs text-gray-400">Start logging to see your weekly trend</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart key={activeChart} data={weeklyChart}
                                    margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`g_${uid}_${activeChart}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={activeColor} stopOpacity={0.28} />
                                            <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey={activeChart}
                                        stroke={activeColor} strokeWidth={2.5}
                                        fill={`url(#g_${uid}_${activeChart})`}
                                        dot={{ r: 3.5, fill: activeColor, strokeWidth: 0 }}
                                        activeDot={{ r: 5.5, fill: activeColor, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* ── ROW 5: Recent Activity (full width — VitaAI removed) ── */}
            <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div variants={fadeUp}>
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900"
                                    style={{ fontFamily: "'Playfair Display', serif" }}>Recent Activity</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Today's health log</p>
                            </div>
                            <button className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:text-[#FFB347] transition-colors">
                                View all <ChevronRight size={13} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3.5 p-3">
                                        <Skeleton style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
                                        <div className="flex-1 space-y-1">
                                            <Skeleton className="w-40 h-4" />
                                            <Skeleton className="w-24 h-3" />
                                        </div>
                                    </div>
                                ))
                            ) : recentActivity.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No activity logged yet</p>
                            ) : (
                                recentActivity.map((item, i) => {
                                    const Icon = ICON_MAP[item.icon] ?? Activity;
                                    return (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + i * 0.1, duration: 0.35 }}
                                            whileHover={{ x: 4, transition: { duration: 0.15 } }}
                                            className="flex items-center gap-3.5 p-3 rounded-xl cursor-default group"
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: item.bg }}>
                                                <Icon size={17} style={{ color: item.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                                                <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {item.cal && <p className="text-xs font-black" style={{ color: item.color }}>{item.cal}</p>}
                                                <p className="text-[10px] text-gray-300 mt-0.5">{item.time}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>

                        {/* Bottom mini stats — from real activity_stats */}
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
                            {[
                                {
                                    label: "Logged today",
                                    value: loading ? "–" : `${activityStats.logged_today ?? 0} items`,
                                    icon: Star, color: "#F59E0B"
                                },
                                {
                                    label: "Calories out",
                                    value: loading ? "–" : `${activityStats.calories_out ?? 0} kcal`,
                                    icon: Flame, color: "#FF6B00"
                                },
                                {
                                    label: "Active time",
                                    value: loading ? "–" : `${activityStats.active_min ?? 0} min`,
                                    icon: Clock, color: "#8B5CF6"
                                },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="text-center p-2.5 rounded-xl"
                                    style={{ background: color + "14" }}>
                                    <Icon size={14} style={{ color }} className="mx-auto mb-1.5" />
                                    <p className="text-xs font-black text-gray-800">{value}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

        </div>
    );
}