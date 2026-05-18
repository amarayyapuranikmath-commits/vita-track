import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale,
    UtensilsCrossed,
    Droplets,
    Moon,
    Dumbbell,
    Pill,
    Smile,
    FileText,
    Footprints,
    Plus,
    Search,
    Zap,
    Flame,
    X,
    Trash2,
} from "lucide-react";
import { fetchLogs, createLog, deleteLog } from "../../api/logs";

// ── Quick Log card meta ───────────────────────────────────────────────
const quickLogCards = [
    {
        id: "weight",
        label: "Weight",
        subtitle: "Track body weight",
        icon: Scale,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-400",
        badgeBg: "bg-orange-500",
        addColor: "text-orange-500",
        addRingColor: "bg-orange-500",
        placeholder: "e.g. 72.5 kg",
    },
    {
        id: "meal",
        label: "Meal",
        subtitle: "Log food & calories",
        icon: UtensilsCrossed,
        iconBg: "bg-green-50",
        iconColor: "text-green-400",
        badgeBg: "bg-green-500",
        addColor: "text-green-500",
        addRingColor: "bg-green-500",
        placeholder: "e.g. Chicken Rice",
    },
    {
        id: "water",
        label: "Water",
        subtitle: "Hydration intake",
        icon: Droplets,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-400",
        badgeBg: "bg-blue-500",
        addColor: "text-blue-500",
        addRingColor: "bg-blue-500",
        placeholder: "e.g. 500 ml",
    },
    {
        id: "sleep",
        label: "Sleep",
        subtitle: "Sleep duration & quality",
        icon: Moon,
        iconBg: "bg-purple-50",
        iconColor: "text-purple-400",
        badgeBg: "bg-purple-500",
        addColor: "text-purple-500",
        addRingColor: "bg-purple-500",
        placeholder: "e.g. 7h 30m · Good",
    },
    {
        id: "workout",
        label: "Workout",
        subtitle: "Exercise sessions",
        icon: Dumbbell,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-400",
        badgeBg: "bg-orange-500",
        addColor: "text-orange-500",
        addRingColor: "bg-orange-500",
        placeholder: "e.g. Push Day · 45 min",
    },
    {
        id: "medicine",
        label: "Medicine",
        subtitle: "Medication tracker",
        icon: Pill,
        iconBg: "bg-red-50",
        iconColor: "text-red-400",
        badgeBg: "bg-red-500",
        addColor: "text-red-500",
        addRingColor: "bg-red-500",
        placeholder: "e.g. Vitamin D · 1 tablet",
    },
    {
        id: "mood",
        label: "Mood",
        subtitle: "Emotional wellbeing",
        icon: Smile,
        iconBg: "bg-pink-50",
        iconColor: "text-pink-400",
        badgeBg: "bg-pink-500",
        addColor: "text-pink-500",
        addRingColor: "bg-pink-500",
        placeholder: "e.g. Happy 😄",
    },
    {
        id: "notes",
        label: "Notes",
        subtitle: "Health observations",
        icon: FileText,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-400",
        badgeBg: "bg-gray-400",
        addColor: "text-gray-500",
        addRingColor: "bg-gray-400",
        placeholder: "e.g. Feeling energetic today",
    },
    {
        id: "steps",
        label: "Steps",
        subtitle: "Track walking activity",
        icon: Footprints,
        iconBg: "bg-teal-50",
        iconColor: "text-teal-400",
        badgeBg: "bg-teal-500",
        addColor: "text-teal-500",
        addRingColor: "bg-teal-500",
        placeholder: "e.g. 8500 steps",
    },
];

// ── Map log type → visual style for timeline ─────────────────────────
const typeStyle = {
    weight: { icon: Scale, dotColor: "bg-orange-400", iconBg: "bg-orange-50", iconColor: "text-orange-400", title: "Weight" },
    meal: { icon: UtensilsCrossed, dotColor: "bg-green-500", iconBg: "bg-green-50", iconColor: "text-green-400", title: "Meal" },
    water: { icon: Droplets, dotColor: "bg-blue-500", iconBg: "bg-blue-50", iconColor: "text-blue-400", title: "Water" },
    sleep: { icon: Moon, dotColor: "bg-purple-500", iconBg: "bg-purple-50", iconColor: "text-purple-400", title: "Sleep" },
    workout: { icon: Dumbbell, dotColor: "bg-orange-400", iconBg: "bg-orange-50", iconColor: "text-orange-400", title: "Workout" },
    medicine: { icon: Pill, dotColor: "bg-red-400", iconBg: "bg-red-50", iconColor: "text-red-400", title: "Medicine" },
    mood: { icon: Smile, dotColor: "bg-pink-500", iconBg: "bg-pink-50", iconColor: "text-pink-400", title: "Mood" },
    notes: { icon: FileText, dotColor: "bg-gray-400", iconBg: "bg-gray-100", iconColor: "text-gray-400", title: "Notes" },
    steps: { icon: Footprints, dotColor: "bg-teal-500", iconBg: "bg-teal-50", iconColor: "text-teal-400", title: "Steps" },
};

// ── Stagger animation helpers ────────────────────────────────────────
const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ── Helper: normalise raw API log (MongoDB may return _id or id) ──────
function normaliseLog(raw) {
    if (!raw) return raw;
    return { ...raw, id: raw.id ?? raw._id ?? raw["_id"] };
}

// ── Helper: parse backend UTC timestamp robustly ──────────────────────
function parseTimestamp(isoString) {
    if (!isoString) return null;
    if (isoString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(isoString)) {
        return new Date(isoString);
    }
    return new Date(isoString + "Z");
}

function formatTime(isoString) {
    if (!isoString) return "";
    const d = parseTimestamp(isoString);
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isToday(isoString) {
    const d = parseTimestamp(isoString);
    if (!d) return false;
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}

function isThisWeek(isoString) {
    const d = parseTimestamp(isoString);
    if (!d) return false;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek;
}

function isThisMonth(isoString) {
    const d = parseTimestamp(isoString);
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ── Helper: build the display string for a meal log ───────────────────
function buildMealDisplayValue(mealName, calories, protein) {
    let parts = [mealName.trim()];
    if (calories && calories.trim()) parts.push(`${calories.trim()} kcal`);
    if (protein && protein.trim()) parts.push(`${protein.trim()}g protein`);
    return parts.join(" · ");
}

// ────────────────────────────────────────────────────────────────────
export default function LogsPage() {
    const [activeFilter, setActiveFilter] = useState("Today");
    const [searchQuery, setSearchQuery] = useState("");

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [activeCard, setActiveCard] = useState(null);

    const [formValue, setFormValue] = useState("");
    const [formNote, setFormNote] = useState("");

    const [formCalories, setFormCalories] = useState("");
    const [formProtein, setFormProtein] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const savingRef = useRef(false);

    const filters = ["Today", "This Week", "This Month"];

    useEffect(() => { loadLogs(); }, []);

    async function loadLogs() {
        try {
            setLoading(true);
            const data = await fetchLogs();
            const normalised = (Array.isArray(data) ? data : [])
                .map(normaliseLog)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setLogs(normalised);
        } catch (err) {
            console.error("Failed to load logs:", err);
        } finally {
            setLoading(false);
        }
    }

    function openModal(card) {
        setActiveCard(card);
        setFormValue("");
        setFormNote("");
        setFormCalories("");
        setFormProtein("");
        setError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setActiveCard(null);
        setFormValue("");
        setFormNote("");
        setFormCalories("");
        setFormProtein("");
        setError("");
    }

    async function handleSave() {
        const isMeal = activeCard?.id === "meal";

        if (!formValue.trim()) {
            setError(isMeal ? "Please enter a meal name." : "Please enter a value.");
            return;
        }

        if (savingRef.current) return;
        savingRef.current = true;

        try {
            setSaving(true);
            setError("");

            let payload;

            if (isMeal) {
                const displayValue = buildMealDisplayValue(
                    formValue,
                    formCalories,
                    formProtein,
                );

                const structuredNote = JSON.stringify({
                    meal_name: formValue.trim(),
                    calories: formCalories.trim() ? parseFloat(formCalories) : null,
                    protein: formProtein.trim() ? parseFloat(formProtein) : null,
                });

                payload = await createLog("meal", displayValue, structuredNote);

            } else {
                payload = await createLog(
                    activeCard.id,
                    formValue.trim(),
                    formNote.trim(),
                );
            }

            const unwrapped =
                payload && typeof payload === "object" && !payload.type &&
                    (payload.log ?? payload.data ?? payload.result)
                    ? (payload.log ?? payload.data ?? payload.result)
                    : payload;

            const newLog = normaliseLog(unwrapped);

            setLogs((prev) => [newLog, ...prev]);
            closeModal();

        } catch (err) {
            console.error("Failed to save log:", err);
            setError("Failed to save. Please try again.");
        } finally {
            setSaving(false);
            savingRef.current = false;
        }
    }

    async function handleDelete(logId) {
        const prev = logs;
        setLogs((current) => current.filter((l) => l.id !== logId));
        try {
            await deleteLog(logId);
        } catch (err) {
            console.error("Failed to delete log:", err);
            setLogs(prev);
        }
    }

    // ── DERIVED STATE ────────────────────────────────────────────────

    const countByType = logs.reduce((acc, log) => {
        if (log.type) acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
    }, {});

    function filterByTab(log) {
        if (!log.created_at) return false;
        if (activeFilter === "Today") return isToday(log.created_at);
        if (activeFilter === "This Week") return isThisWeek(log.created_at);
        if (activeFilter === "This Month") return isThisMonth(log.created_at);
        return true;
    }

    const visibleLogs = logs
        .filter(filterByTab)
        .filter((log) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                (log.type && log.type.toLowerCase().includes(q)) ||
                (log.value && log.value.toLowerCase().includes(q)) ||
                (log.note && log.note.toLowerCase().includes(q))
            );
        });

    const todayLogs = logs.filter((l) => l.created_at && isToday(l.created_at));
    const uniqueTypesToday = new Set(todayLogs.map((l) => l.type)).size;
    const ringProgress = uniqueTypesToday / 9;

    const todayMealLog = todayLogs.find((l) => l.type === "meal");
    const todayWaterLogs = todayLogs.filter((l) => l.type === "water");
    const todayWorkout = todayLogs.find((l) => l.type === "workout");

    const summaryStats = [
        {
            id: "total", label: "Total Logs",
            value: String(todayLogs.length),
            icon: FileText, iconBg: "bg-gray-100", iconColor: "text-gray-500", cardBg: "bg-white",
        },
        {
            id: "calories", label: "Calories",
            value: todayMealLog ? todayMealLog.value : "—",
            icon: Flame, iconBg: "bg-green-100", iconColor: "text-green-500", cardBg: "bg-green-50",
        },
        {
            id: "water", label: "Water",
            value: todayWaterLogs.length > 0 ? todayWaterLogs.map((l) => l.value).join(", ") : "—",
            icon: Droplets, iconBg: "bg-blue-100", iconColor: "text-blue-500", cardBg: "bg-blue-50",
        },
        {
            id: "active", label: "Active Time",
            value: todayWorkout ? todayWorkout.value : "—",
            icon: Zap, iconBg: "bg-orange-100", iconColor: "text-orange-500", cardBg: "bg-orange-50",
        },
    ];

    const isMealModal = activeCard?.id === "meal";

    // ── RENDER ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 px-6 py-6">

            {/* ── MODAL ─────────────────────────────────────────────────── */}
            <AnimatePresence>
                {modalOpen && activeCard && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="fixed inset-0 bg-black/30 z-40"
                        />

                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm p-6">

                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${activeCard.iconBg} flex items-center justify-center`}>
                                            <activeCard.icon size={18} className={activeCard.iconColor} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Log {activeCard.label}</p>
                                            <p className="text-xs text-gray-400">{activeCard.subtitle}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                    >
                                        <X size={14} className="text-gray-500" />
                                    </button>
                                </div>

                                {isMealModal ? (
                                    <>
                                        <div className="mb-3">
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                                Meal Name <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="e.g. Chicken Rice"
                                                value={formValue}
                                                onChange={(e) => setFormValue(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                                Calories (kcal){" "}
                                                <span className="text-gray-400 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 450"
                                                value={formCalories}
                                                onChange={(e) => setFormCalories(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                                Protein (g){" "}
                                                <span className="text-gray-400 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 32"
                                                value={formProtein}
                                                onChange={(e) => setFormProtein(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                                Value <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder={activeCard.placeholder}
                                                value={formValue}
                                                onChange={(e) => setFormValue(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                                Note{" "}
                                                <span className="text-gray-400 font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Add a note..."
                                                value={formNote}
                                                onChange={(e) => setFormNote(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                                            />
                                        </div>
                                    </>
                                )}

                                {error && (
                                    <p className="text-xs text-red-500 mb-3">{error}</p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${saving
                                            ? "bg-orange-300 cursor-not-allowed"
                                            : "bg-orange-500 hover:bg-orange-600"
                                            }`}
                                    >
                                        {saving ? "Saving..." : "Save Log"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Top Header ─────────────────────────────────────────────── */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">
                        HEALTH TRACKING
                    </p>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                        Daily Logs
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Track your health data in one place
                    </p>
                </div>

                {/* Progress ring */}
                <div className="hidden lg:flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3">
                    <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                            <circle
                                cx="28" cy="28" r="22"
                                fill="none" stroke="#f97316" strokeWidth="5"
                                strokeDasharray={2 * Math.PI * 22}
                                strokeDashoffset={2 * Math.PI * 22 * (1 - ringProgress)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-bold text-gray-900 leading-none">{uniqueTypesToday}</span>
                            <span className="text-[10px] text-gray-400 leading-none">of 9</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{uniqueTypesToday} of 9 logs</p>
                        <p className="text-xs text-gray-500">completed today</p>
                        <p className="text-xs text-orange-500 font-medium mt-0.5">
                            {uniqueTypesToday >= 6
                                ? "⚡ Great job!"
                                : uniqueTypesToday >= 3
                                    ? "💪 Keep going!"
                                    : "🌅 Let's start!"}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Quick Log Section ───────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Quick Log</h2>
                    <span className="text-sm text-gray-400">Tap any card to log</span>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                    {quickLogCards.map((card) => {
                        const Icon = card.icon;
                        const count = countByType[card.id] || 0;
                        return (
                            <motion.div
                                key={card.id}
                                variants={cardVariants}
                                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                                        <Icon size={20} className={card.iconColor} />
                                    </div>
                                    {count > 0 && (
                                        <span className={`${card.badgeBg} text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center`}>
                                            {count}
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm font-semibold text-gray-900 leading-tight">{card.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5 mb-3 leading-tight">{card.subtitle}</p>

                                <button
                                    onClick={() => openModal(card)}
                                    className={`flex items-center gap-1.5 text-xs font-semibold ${card.addColor} hover:opacity-80 transition-opacity`}
                                >
                                    <span className={`w-4 h-4 rounded-full ${card.addRingColor} flex items-center justify-center`}>
                                        <Plus size={10} className="text-white" />
                                    </span>
                                    Add entry
                                </button>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* ── Today's Entries ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Today's Entries</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{visibleLogs.length} logs recorded</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-300 w-36"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`text-xs font-medium px-3 py-1 rounded-lg transition-all ${activeFilter === f
                                        ? "bg-orange-500 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-0">
                    {loading ? (
                        <p className="text-sm text-gray-400 py-6 text-center">Loading logs...</p>
                    ) : visibleLogs.length === 0 ? (
                        <p className="text-sm text-gray-400 py-6 text-center">
                            {searchQuery
                                ? "No logs match your search."
                                : "No logs yet. Tap a card above to add one!"}
                        </p>
                    ) : (
                        <AnimatePresence initial={false}>
                            {visibleLogs.map((entry, idx) => {
                                const style = typeStyle[entry.type] || typeStyle["notes"];
                                const Icon = style.icon;
                                const isLast = idx === visibleLogs.length - 1;
                                return (
                                    <motion.div
                                        key={entry.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.3 }}
                                        className="flex items-center gap-3 relative group"
                                    >
                                        <div className="flex flex-col items-center self-stretch pt-3">
                                            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${style.dotColor} z-10 flex-shrink-0`} />
                                            {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                                        </div>

                                        <div className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0 my-3`}>
                                            <Icon size={16} className={style.iconColor} />
                                        </div>

                                        <div className="flex-1 py-3 border-b border-gray-50 last:border-0">
                                            <p className="text-sm font-semibold text-gray-900">{style.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{entry.value}</p>
                                            {entry.note && !entry.note.startsWith("{") && (
                                                <p className="text-xs text-gray-300 mt-0.5 italic">{entry.note}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0 py-3">
                                            <span className="text-xs text-gray-400">{formatTime(entry.created_at)}</span>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100"
                                                title="Delete log"
                                            >
                                                <Trash2 size={11} className="text-red-400" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
                    {summaryStats.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + idx * 0.08, duration: 0.3 }}
                                className={`${stat.cardBg} rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100`}
                            >
                                <div className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon size={15} className={stat.iconColor} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{stat.value}</p>
                                    <p className="text-xs text-gray-400">{stat.label}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}