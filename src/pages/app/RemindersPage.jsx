import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Droplets, UtensilsCrossed, Dumbbell, Moon, Pill, Scale,
    PersonStanding, Bell, X, Plus, Clock, Volume2,
    Smartphone, Vibrate, ChevronRight, Pencil, Trash2,
    CheckCircle2, Timer, Zap, AlarmClock,
    Sparkles, TrendingUp, Sun
} from "lucide-react";
import {
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder as apiDeleteReminder,
} from "../../api/reminders";

// ── Category metadata ─────────────────────────────────────────────────
const CATEGORIES = [
    { id: "water", label: "Water Reminder", emoji: "💧", icon: Droplets, color: "#06B6D4", bg: "#E0F9FD", desc: "Stay hydrated throughout the day" },
    { id: "meal", label: "Meal Reminder", emoji: "🍽️", icon: UtensilsCrossed, color: "#F59E0B", bg: "#FEF3C7", desc: "Track your meals on schedule" },
    { id: "workout", label: "Workout Reminder", emoji: "💪", icon: Dumbbell, color: "#FF6B00", bg: "#FFF0E6", desc: "Keep your fitness goals on track" },
    { id: "sleep", label: "Sleep Reminder", emoji: "🌙", icon: Moon, color: "#8B5CF6", bg: "#F0EBFF", desc: "Maintain a healthy sleep schedule" },
    { id: "medicine", label: "Medicine Reminder", emoji: "💊", icon: Pill, color: "#EF4444", bg: "#FEE2E2", desc: "Never miss your medications" },
    { id: "weight", label: "Weight Check", emoji: "⚖️", icon: Scale, color: "#22C55E", bg: "#DCFCE7", desc: "Monitor your weight progress" },
    { id: "stretch", label: "Stretch Break", emoji: "🧘", icon: PersonStanding, color: "#06B6D4", bg: "#E0F9FD", desc: "Relax and recharge your body" },
    { id: "custom", label: "Custom Reminder", emoji: "🔔", icon: Bell, color: "#8B5CF6", bg: "#F0EBFF", desc: "Create your own health habit" },
];

const REPEAT_OPTIONS = ["One Time", "Daily", "Weekdays", "Weekends", "Custom"];
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const defaultForm = {
    name: "", date: "", time: "08:00", repeat: "Daily",
    custom_days: [], sound: true, push: true, vibration: false, category: null,
};

// ── Label ↔ backend repeat value maps ────────────────────────────────
function repeatToLabel(r) {
    return { once: "One Time", daily: "Daily", weekdays: "Weekdays", weekends: "Weekends", custom: "Custom" }[r] ?? "Daily";
}
function labelToRepeat(l) {
    return { "One Time": "once", "Daily": "daily", "Weekdays": "weekdays", "Weekends": "weekends", "Custom": "custom" }[l] ?? "daily";
}

// ── Core countdown helper (in SECONDS, not minutes) ──────────────────
// Returns seconds until the reminder fires next, or 0 if it is firing NOW,
// or null if the reminder is not schedulable today (wrong day / completed).
function secondsUntil(reminder, now = new Date()) {
    if (!reminder.enabled || !reminder.time) return null;

    const [hh, mm] = reminder.time.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) return null;

    const repeat = reminder.repeat;  // backend value: once|daily|weekdays|weekends|custom
    const todayDow = now.getDay();    // 0=Sun…6=Sat
    const isWeekday = todayDow >= 1 && todayDow <= 5;
    const isWeekend = todayDow === 0 || todayDow === 6;

    // Build candidate fire time for today
    const fireToday = new Date(now);
    fireToday.setHours(hh, mm, 0, 0);

    // For "once" reminders check the date field
    if (repeat === "once") {
        if (reminder.completed_today) return null;
        if (!reminder.date) return null;
        const [fy, fm, fd] = reminder.date.split("-").map(Number);
        const fireDate = new Date(fy, fm - 1, fd, hh, mm, 0, 0);
        const secs = Math.round((fireDate - now) / 1000);
        return secs;
    }

    // Check if today is a valid firing day
    let validToday = false;
    if (repeat === "daily") validToday = true;
    if (repeat === "weekdays") validToday = isWeekday;
    if (repeat === "weekends") validToday = isWeekend;
    if (repeat === "custom") {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        validToday = (reminder.custom_days ?? []).includes(dayNames[todayDow]);
    }

    if (!validToday) {
        // Find next valid day
        for (let offset = 1; offset <= 7; offset++) {
            const nextDow = (todayDow + offset) % 7;
            const isWD = nextDow >= 1 && nextDow <= 5;
            const isWE = nextDow === 0 || nextDow === 6;
            let valid = false;
            if (repeat === "weekdays") valid = isWD;
            if (repeat === "weekends") valid = isWE;
            if (repeat === "custom") {
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                valid = (reminder.custom_days ?? []).includes(dayNames[nextDow]);
            }
            if (valid) {
                const next = new Date(now);
                next.setDate(now.getDate() + offset);
                next.setHours(hh, mm, 0, 0);
                return Math.round((next - now) / 1000);
            }
        }
        return null;
    }

    // Today IS valid — fire today if time hasn't passed, else tomorrow (daily/custom/etc.)
    if (fireToday > now) {
        return Math.round((fireToday - now) / 1000);
    }

    // Already fired today — for repeating reminders, schedule tomorrow (or next valid day)
    if (reminder.completed_today) return null;

    // Not yet marked completed but past time → return 0 meaning "NOW"
    return 0;
}

// ── Format seconds → human string ────────────────────────────────────
function formatSeconds(secs) {
    if (secs === null) return "—";
    if (secs <= 0) return "NOW";
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Animation variants ────────────────────────────────────────────────
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
};
const modalVariants = {
    hidden: { opacity: 0, scale: 0.93, y: 30 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 30 } },
    exit: { opacity: 0, scale: 0.93, y: 30, transition: { duration: 0.18 } },
};

// ── Toggle ────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle, color }) {
    return (
        <button
            onClick={onToggle}
            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
            style={{ background: enabled ? color : "#E5E7EB" }}
        >
            <motion.div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                animate={{ left: enabled ? "22px" : "2px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </button>
    );
}

// ── Modal toggle row ──────────────────────────────────────────────────
function ModalToggleRow({ icon: Icon, label, value, onChange, color }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
                    <Icon size={15} style={{ color }} />
                </div>
                <span className="text-sm font-medium text-[#374151]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
            </div>
            <Toggle enabled={value} onToggle={() => onChange(!value)} color={color} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────
export default function RemindersPage() {

    // ── Core state ───────────────────────────────────────────────────────
    const [reminders, setReminders] = useState([]);   // raw from backend, never stores nextIn
    const [loading, setLoading] = useState(true);

    // ── Live clock — ticks every second ─────────────────────────────────
    // This is the ONLY clock. All countdown displays are derived from it.
    const [now, setNow] = useState(() => new Date());

    // ── Modal ────────────────────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    // ── Delete confirm ────────────────────────────────────────────────────
    const [deleteId, setDeleteId] = useState(null);

    const savingRef = useRef(false);
    // Track which reminder IDs have already been triggered this second
    // so we don't fire the backend call repeatedly on every tick
    const triggeredRef = useRef(new Set());

    // ── 1-second clock tick ──────────────────────────────────────────────
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // ── Load reminders on mount ──────────────────────────────────────────
    useEffect(() => { loadReminders(); }, []);

    async function loadReminders() {
        try {
            setLoading(true);
            const data = await fetchReminders();
            setReminders(Array.isArray(data) ? data.map(normalise) : []);
        } catch (err) {
            console.error("Failed to load reminders:", err);
        } finally {
            setLoading(false);
        }
    }

    // ── Normalise raw API object ─────────────────────────────────────────
    // NOTE: we do NOT store nextIn here — it is always computed live.
    function normalise(raw) {
        const cat = CATEGORIES.find(c => c.id === raw.category) ?? CATEGORIES[7];
        return {
            ...raw,
            id: raw.id ?? raw._id,
            emoji: raw.emoji ?? cat.emoji,
            color: raw.color ?? cat.color,
            bg: raw.bg ?? cat.bg,
            custom_days: raw.custom_days ?? [],
        };
    }

    // ── Trigger detection — runs on every clock tick ─────────────────────
    // Checks each enabled, non-completed reminder. When secondsUntil === 0:
    //   • "once"  → mark completed_today=true + enabled=false (backend + local)
    //   • repeating → mark completed_today=true (backend + local); will reset next day
    useEffect(() => {
        reminders.forEach(r => {
            if (!r.enabled || r.completed_today) return;
            const secs = secondsUntil(r, now);
            if (secs !== 0) return;                          // not time yet (or null)
            if (triggeredRef.current.has(r.id)) return;      // already fired this trigger window
            triggeredRef.current.add(r.id);

            // Optimistic local update
            setReminders(prev => prev.map(x => {
                if (x.id !== r.id) return x;
                return {
                    ...x,
                    completed_today: true,
                    enabled: r.repeat === "once" ? false : x.enabled,
                };
            }));

            // Backend update
            const patch = { completed_today: true };
            if (r.repeat === "once") patch.enabled = false;
            updateReminder(r.id, patch).then(() => {
                window.dispatchEvent(new CustomEvent("reminders_updated"));
            }).catch(err =>
                console.error("Failed to mark reminder completed:", err)
            );
        });
    }, [now, reminders]);

    // ── Reset completed_today at midnight ────────────────────────────────
    // When the date changes, clear completed_today for all repeating reminders
    // and clear the triggered set so they can fire again today.
    const todayStr = now.toDateString();
    const prevDateRef = useRef(todayStr);
    useEffect(() => {
        if (prevDateRef.current === todayStr) return;
        prevDateRef.current = todayStr;
        triggeredRef.current.clear();

        setReminders(prev => prev.map(r => {
            if (r.repeat === "once") return r;   // once reminders stay completed
            return { ...r, completed_today: false };
        }));
    }, [todayStr]);

    // ── Derived: compute live countdown for every reminder ────────────────
    // useMemo recalculates every second when `now` changes.
    const remindersWithCountdown = useMemo(() => {
        return reminders.map(r => ({
            ...r,
            secsUntil: secondsUntil(r, now),
        }));
    }, [reminders, now]);

    // ── Derived: completed today count (live) ────────────────────────────
    const completedToday = useMemo(
        () => reminders.filter(r => r.completed_today).length,
        [reminders]
    );

    // ── Derived: next upcoming reminder ──────────────────────────────────
    const nextReminder = useMemo(() => {
        return remindersWithCountdown
            .filter(r => r.enabled && !r.completed_today && r.secsUntil !== null && r.secsUntil > 0)
            .sort((a, b) => a.secsUntil - b.secsUntil)[0] ?? null;
    }, [remindersWithCountdown]);

    // ── Modal helpers ─────────────────────────────────────────────────────
    function openCreate(category) {
        setEditTarget(null);
        setSaveError("");
        setForm({
            ...defaultForm,
            category,
            name: category ? CATEGORIES.find(c => c.id === category)?.label ?? "" : "",
        });
        setModalOpen(true);
    }

    function openEdit(r) {
        setEditTarget(r.id);
        setSaveError("");
        setForm({
            name: r.name,
            date: r.date ?? "",
            time: r.time,
            repeat: repeatToLabel(r.repeat),
            custom_days: r.custom_days ?? [],
            sound: r.sound ?? true,
            push: r.push ?? true,
            vibration: r.vibration ?? false,
            category: r.category,
        });
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditTarget(null);
        setForm(defaultForm);
        setSaveError("");
    }

    // ── Save ──────────────────────────────────────────────────────────────
    async function saveReminder() {
        if (!form.name.trim()) return;
        if (savingRef.current) return;
        if (form.repeat === "One Time" && !form.date) {
            setSaveError("Please select a date for One Time reminders.");
            return;
        }
        if (form.repeat === "Custom" && form.custom_days.length === 0) {
            setSaveError("Please select at least one day for Custom repeat.");
            return;
        }
        savingRef.current = true;
        try {
            setSaving(true);
            setSaveError("");
            const payload = {
                category: form.category ?? "custom",
                name: form.name.trim(),
                date: form.date || "",
                time: form.time,
                repeat: labelToRepeat(form.repeat),
                custom_days: form.custom_days || [],
                sound: form.sound,
                push: form.push,
                vibration: form.vibration,
            };
            if (editTarget) {
                const updated = await updateReminder(editTarget, payload);
                // Clear trigger record so it can fire again if time was changed
                triggeredRef.current.delete(editTarget);
                setReminders(prev => prev.map(r => r.id === editTarget ? normalise(updated) : r));
            } else {
                const created = await createReminder(payload);
                setReminders(prev => [normalise(created), ...prev]);
            }
            closeModal();
            window.dispatchEvent(new CustomEvent("reminders_updated"));
        } catch (err) {
            console.error("Failed to save reminder:", err);
            setSaveError("Failed to save. Please try again.");
        } finally {
            setSaving(false);
            savingRef.current = false;
        }
    }

    // ── Toggle enabled (optimistic) ───────────────────────────────────────
    const toggleReminder = useCallback(async (id) => {
        const reminder = reminders.find(r => r.id === id);
        if (!reminder) return;
        const newEnabled = !reminder.enabled;
        setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: newEnabled } : r));
        try {
            await updateReminder(id, { enabled: newEnabled });
            window.dispatchEvent(new CustomEvent("reminders_updated"));
        } catch (err) {
            console.error("Failed to toggle reminder:", err);
            setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: !newEnabled } : r));
        }
    }, [reminders]);

    // ── Delete (optimistic) ───────────────────────────────────────────────
    async function deleteReminder(id) {
        const snapshot = reminders;
        setReminders(prev => prev.filter(r => r.id !== id));
        setDeleteId(null);
        triggeredRef.current.delete(id);
        try {
            await apiDeleteReminder(id);
            window.dispatchEvent(new CustomEvent("reminders_updated"));
        } catch (err) {
            console.error("Failed to delete reminder:", err);
            setReminders(snapshot);
        }
    }

    const selCat = form.category
        ? CATEGORIES.find(c => c.id === form.category) ?? CATEGORIES[7]
        : CATEGORIES[7];

    // ── RENDER ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen" style={{ background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .playfair { font-family: 'Playfair Display', serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* ── Page Header ──────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#FF6B00,#F59E0B)" }}>
                                <AlarmClock size={16} className="text-white" />
                            </div>
                            <span className="text-xs font-semibold tracking-widest uppercase text-[#9CA3AF]">Health Habits</span>
                        </div>
                        <h1 className="playfair text-4xl font-bold text-[#111827] leading-tight">Smart Reminders</h1>
                        <p className="mt-1 text-[#6B7280] text-base font-light">Never miss your health habits</p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => openCreate(null)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-lg"
                        style={{ background: "linear-gradient(135deg,#FF6B00,#F59E0B)", boxShadow: "0 4px 20px rgba(255,107,0,0.35)" }}
                    >
                        <Plus size={16} />
                        New Reminder
                    </motion.button>
                </motion.div>

                {/* ── Stats Row ────────────────────────────────────────────── */}
                <motion.div
                    variants={containerVariants} initial="hidden" animate="show"
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
                >
                    {[
                        {
                            label: "Completed today",
                            value: completedToday,
                            icon: CheckCircle2, color: "#22C55E", bg: "#DCFCE7", suffix: "",
                        },
                        {
                            label: "Active reminders",
                            value: reminders.filter(r => r.enabled).length,
                            icon: Zap, color: "#FF6B00", bg: "#FFF0E6", suffix: "",
                        },
                        {
                            label: "Next reminder",
                            value: nextReminder ? formatSeconds(nextReminder.secsUntil) : "—",
                            icon: Timer, color: "#8B5CF6", bg: "#F0EBFF",
                            suffix: nextReminder ? " away" : "",
                        },
                    ].map(s => (
                        <motion.div key={s.label} variants={itemVariants}
                            className="bg-white rounded-3xl p-5 shadow-sm border border-[#F3F4F6] flex items-center gap-4"
                        >
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                <s.icon size={22} style={{ color: s.color }} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-[#111827]">{s.value}{s.suffix}</div>
                                <div className="text-xs text-[#9CA3AF] font-medium mt-0.5">{s.label}</div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ── Left Column ──────────────────────────────────────── */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">

                        {/* Quick Add */}
                        <div>
                            <h2 className="playfair text-xl font-semibold text-[#111827] mb-4">Quick Add</h2>
                            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {CATEGORIES.map(cat => (
                                    <motion.button
                                        key={cat.id}
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.04, y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.10)" }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => openCreate(cat.id)}
                                        className="bg-white rounded-2xl p-4 text-left border border-[#F3F4F6] shadow-sm group transition-all duration-200 cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-110"
                                            style={{ background: cat.bg }}>
                                            <cat.icon size={19} style={{ color: cat.color }} />
                                        </div>
                                        <p className="text-xs font-semibold text-[#374151] leading-snug">{cat.label}</p>
                                        <p className="text-[10px] text-[#9CA3AF] mt-0.5 leading-snug hidden group-hover:block transition-all">{cat.desc}</p>
                                        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={10} style={{ color: cat.color }} />
                                            <span className="text-[10px] font-semibold" style={{ color: cat.color }}>Add</span>
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </div>

                        {/* Active Reminders */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="playfair text-xl font-semibold text-[#111827]">Active Reminders</h2>
                                <span className="text-xs font-semibold text-[#9CA3AF] bg-[#F3F4F6] rounded-full px-3 py-1">
                                    {reminders.length} total
                                </span>
                            </div>

                            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                                {loading ? (
                                    <p className="text-sm text-[#9CA3AF] text-center py-10">Loading reminders...</p>
                                ) : (
                                    <AnimatePresence>
                                        {remindersWithCountdown.map(r => {
                                            const secs = r.secsUntil;
                                            const isNow = secs === 0;
                                            const isDone = r.completed_today;
                                            const showBar = r.enabled && !isDone && secs !== null;
                                            // Progress bar fill: 100% when NOW, scales linearly for up to 5h window
                                            const barPct = isNow ? 100 : secs !== null
                                                ? Math.max(10, 100 - (secs / (5 * 3600)) * 100)
                                                : 10;

                                            return (
                                                <motion.div
                                                    key={r.id}
                                                    variants={itemVariants}
                                                    layout
                                                    exit={{ opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.2 } }}
                                                    className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm overflow-hidden"
                                                >
                                                    <div className="flex items-center gap-4 p-4">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                                                            style={{ background: r.bg }}>
                                                            {r.emoji}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-sm font-semibold ${r.enabled ? "text-[#111827]" : "text-[#9CA3AF]"} truncate`}>
                                                                    {r.name}
                                                                </span>

                                                                {/* Status badge — mutually exclusive */}
                                                                {isDone && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#22C55E]">
                                                                        DONE
                                                                    </span>
                                                                )}
                                                                {!isDone && isNow && r.enabled && (
                                                                    <motion.span
                                                                        animate={{ opacity: [1, 0.4, 1] }}
                                                                        transition={{ repeat: Infinity, duration: 1 }}
                                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#EF4444]"
                                                                    >
                                                                        NOW
                                                                    </motion.span>
                                                                )}
                                                                {!isDone && !isNow && r.enabled && secs !== null && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                                        style={{ background: r.bg, color: r.color }}>
                                                                        ACTIVE
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                                <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                                                                    <Clock size={11} /> {r.time}
                                                                </span>
                                                                {r.repeat === "once" && r.date && (
                                                                    <span className="text-xs text-[#9CA3AF]">{r.date}</span>
                                                                )}
                                                                {r.repeat === "custom" && r.custom_days?.length > 0 && (
                                                                    <span className="text-xs text-[#9CA3AF]">{r.custom_days.join(", ")}</span>
                                                                )}
                                                                {/* Live countdown — updates every second */}
                                                                {r.enabled && !isDone && secs !== null && (
                                                                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: r.color }}>
                                                                        <Timer size={11} />
                                                                        {isNow ? "Firing now!" : `in ${formatSeconds(secs)}`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <Toggle enabled={r.enabled} onToggle={() => toggleReminder(r.id)} color={r.color} />
                                                            <button
                                                                onClick={() => openEdit(r)}
                                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] transition-all"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteId(r.id)}
                                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    {showBar && (
                                                        <div className="h-0.5 w-full" style={{ background: r.bg }}>
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000"
                                                                style={{ background: r.color, width: `${barPct}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                )}

                                {!loading && reminders.length === 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="text-center py-16 text-[#9CA3AF]">
                                        <Bell size={36} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No reminders yet</p>
                                        <p className="text-xs mt-1">Click a category above to get started</p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* ── Right Column ─────────────────────────────────────── */}
                    <div className="col-span-12 lg:col-span-4 space-y-5">

                        {/* Next Reminder Widget */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-3xl p-5 text-white overflow-hidden relative"
                            style={{ background: "linear-gradient(135deg,#FF6B00 0%,#F59E0B 100%)" }}
                        >
                            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white opacity-10" />
                            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white opacity-10" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                                        <Timer size={14} className="text-white" />
                                    </div>
                                    <span className="text-xs font-semibold tracking-wider uppercase opacity-80">Upcoming</span>
                                </div>

                                {nextReminder ? (
                                    <>
                                        {/* Live countdown in the widget */}
                                        <div className="text-4xl font-bold mb-1">{formatSeconds(nextReminder.secsUntil)}</div>
                                        <p className="text-sm opacity-80 font-light">until your next reminder</p>
                                        <div className="mt-4 flex items-center gap-2.5 bg-white/20 rounded-2xl px-4 py-2.5">
                                            <span className="text-xl">{nextReminder.emoji}</span>
                                            <div>
                                                <p className="text-sm font-semibold">{nextReminder.name}</p>
                                                <p className="text-xs opacity-75">{nextReminder.time}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm opacity-70 font-light">No upcoming reminders. Enable one!</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Today's Progress */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl p-5 border border-[#F3F4F6] shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="playfair text-base font-semibold text-[#111827]">Today's Progress</h3>
                                <TrendingUp size={16} className="text-[#22C55E]" />
                            </div>
                            {/* Live completedToday count */}
                            <div className="flex items-end gap-2 mb-3">
                                <span className="text-4xl font-bold text-[#111827]">{completedToday}</span>
                                <span className="text-sm text-[#9CA3AF] mb-1.5 font-light">completed</span>
                            </div>
                            <div className="flex items-end gap-1.5 h-14 mb-3">
                                {[8, 12, 6, 10, 14, 9, completedToday].map((v, i) => (
                                    <motion.div
                                        key={i}
                                        className="flex-1 rounded-t-lg"
                                        style={{ background: i === 6 ? "#22C55E" : "#F3F4F6" }}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(v / Math.max(14, completedToday)) * 100}%` }}
                                        transition={{ delay: 0.4 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                                    <span key={i} className={`flex-1 text-center ${i === 6 ? "font-bold text-[#22C55E]" : ""}`}>{d}</span>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center gap-2 bg-[#DCFCE7] rounded-2xl px-3 py-2">
                                <CheckCircle2 size={14} className="text-[#22C55E]" />
                                <span className="text-xs font-medium text-[#16A34A]">
                                    {completedToday > 0 ? "Great streak! Keep it up 🔥" : "Complete a reminder to start your streak!"}
                                </span>
                            </div>
                        </motion.div>

                        {/* Pro Tip */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-3xl p-5 border border-[#F3F4F6] shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={15} style={{ color: "#8B5CF6" }} />
                                <h3 className="text-sm font-semibold text-[#111827]">Pro Tip</h3>
                            </div>
                            <p className="text-xs text-[#6B7280] leading-relaxed">
                                Drinking water every 2 hours reduces fatigue by <strong className="text-[#111827]">30%</strong>.
                                Set a water reminder to stay energized all day!
                            </p>
                            <button
                                onClick={() => openCreate("water")}
                                className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: "#06B6D4" }}
                            >
                                💧 Add Water Reminder
                            </button>
                        </motion.div>

                        {/* Popular Times */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-3xl p-5 border border-[#F3F4F6] shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sun size={15} style={{ color: "#F59E0B" }} />
                                <h3 className="text-sm font-semibold text-[#111827]">Popular Times</h3>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { time: "07:00", label: "Morning Workout", color: "#FF6B00", category: "workout" },
                                    { time: "13:00", label: "Lunch Reminder", color: "#F59E0B", category: "meal" },
                                    { time: "18:00", label: "Evening Walk", color: "#22C55E", category: "workout" },
                                    { time: "22:30", label: "Sleep Time", color: "#8B5CF6", category: "sleep" },
                                ].map(s => (
                                    <button
                                        key={s.time}
                                        onClick={() => openCreate(s.category)}
                                        className="w-full flex items-center justify-between group hover:bg-[#F9FAFB] rounded-xl px-3 py-2 transition-all"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                            <span className="text-xs text-[#374151] font-medium">{s.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-[#9CA3AF]">{s.time}</span>
                                            <ChevronRight size={11} className="text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ── Create / Edit Modal ───────────────────────────────────── */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />

                        <motion.div
                            variants={modalVariants} initial="hidden" animate="show" exit="exit"
                            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden z-10"
                        >
                            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${selCat.color}, ${selCat.color}88)` }} />

                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: selCat.bg }}>
                                            {selCat.emoji}
                                        </div>
                                        <div>
                                            <h3 className="playfair text-lg font-bold text-[#111827]">
                                                {editTarget ? "Edit Reminder" : "New Reminder"}
                                            </h3>
                                            <p className="text-xs text-[#9CA3AF]">{selCat.label}</p>
                                        </div>
                                    </div>
                                    <button onClick={closeModal}
                                        className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-all">
                                        <X size={15} className="text-[#6B7280]" />
                                    </button>
                                </div>

                                {/* Category selector (create only) */}
                                {!editTarget && (
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wider">Category</label>
                                        <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto hide-scrollbar">
                                            {CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setForm(f => ({ ...f, category: cat.id, name: cat.label }))}
                                                    className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs font-medium"
                                                    style={{
                                                        borderColor: form.category === cat.id ? cat.color : "#F3F4F6",
                                                        background: form.category === cat.id ? cat.bg : "#FAFAFA",
                                                        color: form.category === cat.id ? cat.color : "#9CA3AF",
                                                    }}
                                                >
                                                    <span className="text-base">{cat.emoji}</span>
                                                    <span className="text-[9px] text-center leading-tight">{cat.label.split(" ")[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Name */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wider">Reminder Name</label>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Drink Water"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] placeholder-[#D1D5DB] outline-none transition-all"
                                        style={{ background: "#F9FAFB" }}
                                        onFocus={e => e.target.style.borderColor = selCat.color}
                                        onBlur={e => e.target.style.borderColor = "#E5E7EB"}
                                    />
                                </div>

                                {/* Repeat */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wider">Repeat</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                        {REPEAT_OPTIONS.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setForm(f => ({ ...f, repeat: opt, date: "", custom_days: [] }))}
                                                className="py-2 rounded-xl text-[10px] font-semibold border-2 transition-all"
                                                style={{
                                                    borderColor: form.repeat === opt ? selCat.color : "#F3F4F6",
                                                    background: form.repeat === opt ? selCat.bg : "#FAFAFA",
                                                    color: form.repeat === opt ? selCat.color : "#6B7280",
                                                }}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date — One Time only */}
                                {form.repeat === "One Time" && (
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wider">Date</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            min={new Date().toISOString().split("T")[0]}
                                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] outline-none"
                                            style={{ background: "#F9FAFB" }}
                                        />
                                    </div>
                                )}

                                {/* Custom days */}
                                {form.repeat === "Custom" && (
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wider">Days</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {WEEK_DAYS.map(day => {
                                                const active = form.custom_days.includes(day);
                                                return (
                                                    <button
                                                        key={day}
                                                        onClick={() => setForm(f => ({
                                                            ...f,
                                                            custom_days: active
                                                                ? f.custom_days.filter(d => d !== day)
                                                                : [...f.custom_days, day],
                                                        }))}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                                                        style={{
                                                            borderColor: active ? selCat.color : "#F3F4F6",
                                                            background: active ? selCat.bg : "#FAFAFA",
                                                            color: active ? selCat.color : "#6B7280",
                                                        }}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Time */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wider">Time</label>
                                    <input
                                        type="time"
                                        value={form.time}
                                        onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] outline-none"
                                        style={{ background: "#F9FAFB" }}
                                    />
                                </div>

                                {/* Notification toggles */}
                                <div className="bg-[#F9FAFB] rounded-2xl px-4 mb-6">
                                    <ModalToggleRow icon={Volume2} label="Sound" value={form.sound} onChange={v => setForm(f => ({ ...f, sound: v }))} color={selCat.color} />
                                    <ModalToggleRow icon={Smartphone} label="Push Notification" value={form.push} onChange={v => setForm(f => ({ ...f, push: v }))} color={selCat.color} />
                                    <ModalToggleRow icon={Vibrate} label="Vibration" value={form.vibration} onChange={v => setForm(f => ({ ...f, vibration: v }))} color={selCat.color} />
                                </div>

                                {saveError && <p className="text-xs text-red-500 mb-3">{saveError}</p>}

                                <div className="flex gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 py-3 rounded-2xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                        onClick={saveReminder}
                                        disabled={!form.name.trim() || saving}
                                        className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                                        style={{
                                            background: `linear-gradient(135deg, ${selCat.color}, ${selCat.color}CC)`,
                                            boxShadow: `0 4px 20px ${selCat.color}40`,
                                        }}
                                    >
                                        {saving ? "Saving..." : editTarget ? "Save Changes" : "Create Reminder"}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete Confirm ────────────────────────────────────────── */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                        <motion.div
                            variants={modalVariants} initial="hidden" animate="show" exit="exit"
                            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 text-center"
                        >
                            <div className="w-14 h-14 bg-[#FEE2E2] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-[#EF4444]" />
                            </div>
                            <h3 className="playfair text-xl font-bold text-[#111827] mb-2">Delete Reminder?</h3>
                            <p className="text-sm text-[#6B7280] mb-6">This reminder will be permanently removed. You can always add it back later.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 py-3 rounded-2xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteReminder(deleteId)}
                                    className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all"
                                    style={{ background: "#EF4444", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}