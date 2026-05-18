/**
 * src/components/Topbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGES (this file only):
 *   • Removed: streak widget, health score widget, user dropdown
 *   • Kept:    search bar, notification bell (position / style unchanged)
 *   • Bell now fetches REAL reminders from GET /api/reminders
 *   • Badge = count of active + not-completed reminders (live, never hardcoded)
 *   • Dropdown shows reminders sorted by nearest upcoming time
 *   • Auto-refreshes every 60 s so adds/deletes in RemindersPage reflect here
 *   • Close dropdown on outside click
 */

import { Search, Bell } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchReminders } from "../api/reminders";

/* ─── Category icon map (same emoji set as backend CATEGORY_META) ─────────── */
const CATEGORY_COLOR = {
    water: "#06B6D4",
    meal: "#F59E0B",
    workout: "#FF6B00",
    sleep: "#8B5CF6",
    medicine: "#EF4444",
    weight: "#22C55E",
    stretch: "#06B6D4",
    custom: "#8B5CF6",
};

/* ─── Sort reminders by nearest upcoming HH:MM time ─────────────────────── */
function sortByTime(reminders) {
    const nowMins = (() => {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes();
    })();

    return [...reminders].sort((a, b) => {
        const toMins = (t = "") => {
            const [h, m] = t.split(":").map(Number);
            return isNaN(h) ? 9999 : h * 60 + (m || 0);
        };
        // Reminders after current time come first; earlier ones wrap to end
        const diff = (mins) => {
            const d = mins - nowMins;
            return d >= 0 ? d : d + 1440;
        };
        return diff(toMins(a.time)) - diff(toMins(b.time));
    });
}

/* ─── Format "HH:MM" → "5:00 PM" ────────────────────────────────────────── */
function fmt12(time = "") {
    const [hRaw, m] = time.split(":");
    const h = parseInt(hRaw, 10);
    if (isNaN(h)) return time;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${(m || "00").padStart(2, "0")} ${suffix}`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Topbar() {
    const [showNotif, setShowNotif] = useState(false);
    const [reminders, setReminders] = useState([]);   // active + pending only
    const dropdownRef = useRef(null);

    /* ── Fetch active, non-completed reminders ─────────────────────────────── */
    const loadReminders = useCallback(async () => {
        try {
            const all = await fetchReminders();
            const active = all.filter(
                (r) => r.enabled && !r.completed_today
            );
            setReminders(sortByTime(active));
        } catch {
            // silently fail — bell just shows 0
        }
    }, []);

    /* ── Initial load + polling + live sync ────────────────────────────────── */
    useEffect(() => {
        loadReminders();
        const interval = setInterval(loadReminders, 60_000);

        const handleSync = () => {
            loadReminders();
        };
        window.addEventListener("reminders_updated", handleSync);

        return () => {
            clearInterval(interval);
            window.removeEventListener("reminders_updated", handleSync);
        };
    }, [loadReminders]);

    /* ── Close dropdown on outside click ──────────────────────────────────── */
    useEffect(() => {
        if (!showNotif) return;
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showNotif]);

    const count = reminders.length;

    return (
        <header
            className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 flex-shrink-0"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
        >
            {/* Left — Search (unchanged) */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                    type="text"
                    placeholder="Search anything..."
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] placeholder-[#6B7280] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#FF6B00]/40 focus:ring-2 focus:ring-[#FF6B00]/10 transition-all"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                />
            </div>

            {/* Right — Bell only */}
            <div className="flex items-center gap-3">

                {/* Notification Bell */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowNotif((v) => !v)}
                        className="relative w-9 h-9 flex items-center justify-center bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl hover:bg-gray-100 transition"
                    >
                        <Bell className="w-4 h-4 text-[#6B7280]" />

                        {/* Badge — hidden when count is 0 */}
                        {count > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                                {count > 9 ? "9+" : count}
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showNotif && (
                        <div
                            className="absolute right-0 top-12 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 p-3"
                            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
                        >
                            <p
                                className="text-[#111827] font-semibold text-sm px-2 mb-3"
                                style={{ fontFamily: "Playfair Display, serif" }}
                            >
                                Reminders
                            </p>

                            {count === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-2xl mb-2">🎉</p>
                                    <p className="text-[#6B7280] text-xs">
                                        All caught up! No pending reminders.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {reminders.map((r) => {
                                        const color = r.color || CATEGORY_COLOR[r.category] || "#8B5CF6";
                                        const emoji = r.emoji || "🔔";
                                        return (
                                            <div
                                                key={r.id}
                                                className="flex items-center gap-3 p-2.5 hover:bg-[#F8FAFC] rounded-xl transition cursor-pointer"
                                            >
                                                {/* Emoji dot */}
                                                <div
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                                                    style={{ background: r.bg || "#F3F4F6" }}
                                                >
                                                    {emoji}
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className="text-[#111827] text-xs font-medium truncate"
                                                        style={{ fontFamily: "DM Sans, sans-serif" }}
                                                    >
                                                        {r.name}
                                                    </p>
                                                    <p className="text-[#6B7280] text-[10px] mt-0.5">
                                                        {fmt12(r.time)}
                                                        {r.repeat && r.repeat !== "once" && (
                                                            <span className="ml-1 capitalize opacity-60">
                                                                · {r.repeat}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Color accent */}
                                                <div
                                                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                                                    style={{ background: color }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-3 pt-2.5 border-t border-[#F3F4F6] px-2">
                                <p className="text-[#9CA3AF] text-[10px]">
                                    Showing active reminders · sorted by next upcoming
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
}