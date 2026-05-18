import { useState, useEffect, useMemo, useRef } from "react";
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from "recharts";
import { fetchLogs } from "../../api/logs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ── Design tokens ──────────────────────────────────────────────
const TOKEN = {
    orange: "#F97316",
    orangeLight: "#FFF7ED",
    orangeMid: "#FDBA74",
    purple: "#7C3AED",
    purpleLight: "#F5F3FF",
    purpleMid: "#C4B5FD",
    text: "#1C1917",
    muted: "#78716C",
    border: "#F5F0EB",
    bg: "#FAFAF9",
    white: "#FFFFFF",
};

// ── Helpers ─────────────────────────────────────────────────────
function TrendBadge({ value }) {
    const up = value >= 0;
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: up ? "#16A34A" : "#DC2626",
            background: up ? "#F0FDF4" : "#FEF2F2",
            borderRadius: 20,
            padding: "2px 8px",
        }}>
            {up ? "↑" : "↓"} {Math.abs(value)}%
        </span>
    );
}

function MiniBar({ pct, color }) {
    return (
        <div style={{
            height: 4, borderRadius: 99,
            background: TOKEN.border, overflow: "hidden",
            marginTop: 10,
        }}>
            <div style={{
                height: "100%", borderRadius: 99,
                width: `${Math.min(pct, 100)}%`,
                background: `linear-gradient(90deg, ${color}99, ${color})`,
                transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
            }} />
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: TOKEN.white, border: `1px solid ${TOKEN.border}`,
            borderRadius: 12, padding: "10px 14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            fontSize: 12, color: TOKEN.text,
        }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, marginTop: 2 }}>
                    {p.name}: <strong>{p.value}</strong>
                </div>
            ))}
        </div>
    );
};

// ── Date helpers ─────────────────────────────────────────────────
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function dayLabel(date) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
}

function lastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(startOfDay(d));
    }
    return days;
}

function parseNumber(str) {
    if (!str) return null;
    const match = str.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
}

// ── Core analytics function ──────────────────────────────────────
function computeAnalytics(logs, period) {
    const days = parseInt(period, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const periodLogs = logs.filter(l => new Date(l.created_at) >= cutoff);

    const prevCutoff = new Date(cutoff);
    prevCutoff.setDate(prevCutoff.getDate() - days);
    const prevLogs = logs.filter(l => {
        const d = new Date(l.created_at);
        return d >= prevCutoff && d < cutoff;
    });

    // ── Health Score Trend ─────────────────────────────────────────
    let healthTrend = [];
    if (days <= 7) {
        const dayList = lastNDays(7);
        healthTrend = dayList.map(day => {
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);
            const dayLogs = periodLogs.filter(l => {
                const d = new Date(l.created_at);
                return d >= day && d < nextDay;
            });
            const uniqueTypes = new Set(dayLogs.map(l => l.type)).size;
            return { day: dayLabel(day), score: Math.round((uniqueTypes / 8) * 100) };
        });
    } else if (days <= 30) {
        for (let w = 3; w >= 0; w--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - w * 7);
            const weekLogs = periodLogs.filter(l => {
                const d = new Date(l.created_at);
                return d >= weekStart && d < weekEnd;
            });
            const daysWithLogs = new Set(weekLogs.map(l =>
                startOfDay(new Date(l.created_at)).toDateString()
            )).size || 1;
            const uniquePerDay = weekLogs.length / daysWithLogs;
            healthTrend.push({
                day: `W${4 - w}`,
                score: Math.round((Math.min(uniquePerDay, 8) / 8) * 100),
            });
        }
    } else {
        for (let m = 2; m >= 0; m--) {
            const mStart = new Date();
            mStart.setMonth(mStart.getMonth() - m);
            mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
            const mEnd = new Date(mStart);
            mEnd.setMonth(mEnd.getMonth() + 1);
            const mLogs = periodLogs.filter(l => {
                const d = new Date(l.created_at);
                return d >= mStart && d < mEnd;
            });
            const daysWithLogs = new Set(mLogs.map(l =>
                startOfDay(new Date(l.created_at)).toDateString()
            )).size || 1;
            const uniquePerDay = mLogs.length / daysWithLogs;
            healthTrend.push({
                day: mStart.toLocaleDateString("en-US", { month: "short" }),
                score: Math.round((Math.min(uniquePerDay, 8) / 8) * 100),
            });
        }
    }

    // ── Calories Trend ─────────────────────────────────────────────
    const CALORIE_GOAL = 2000;
    let caloriesTrend = [];
    if (days <= 7) {
        const dayList = lastNDays(7);
        caloriesTrend = dayList.map(day => {
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);
            const mealLogs = periodLogs.filter(l => {
                const d = new Date(l.created_at);
                return l.type === "meal" && d >= day && d < nextDay;
            });
            const actual = mealLogs.reduce((sum, l) => sum + (parseNumber(l.value) || 0), 0);
            return { day: dayLabel(day), actual, goal: CALORIE_GOAL };
        });
    } else if (days <= 30) {
        for (let w = 3; w >= 0; w--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - w * 7);
            const mealLogs = periodLogs.filter(l => {
                const d = new Date(l.created_at);
                return l.type === "meal" && d >= weekStart && d < weekEnd;
            });
            const actual = Math.round(
                mealLogs.reduce((sum, l) => sum + (parseNumber(l.value) || 0), 0) / 7
            );
            caloriesTrend.push({ day: `W${4 - w}`, actual, goal: CALORIE_GOAL });
        }
    } else {
        for (let m = 2; m >= 0; m--) {
            const mStart = new Date();
            mStart.setMonth(mStart.getMonth() - m);
            mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
            const mEnd = new Date(mStart);
            mEnd.setMonth(mEnd.getMonth() + 1);
            const mLogs = periodLogs.filter(l => {
                const d = new Date(l.created_at);
                return l.type === "meal" && d >= mStart && d < mEnd;
            });
            const daysInMonth = new Set(mLogs.map(l =>
                startOfDay(new Date(l.created_at)).toDateString()
            )).size || 1;
            const actual = Math.round(
                mLogs.reduce((sum, l) => sum + (parseNumber(l.value) || 0), 0) / daysInMonth
            );
            caloriesTrend.push({
                day: mStart.toLocaleDateString("en-US", { month: "short" }),
                actual, goal: CALORIE_GOAL,
            });
        }
    }

    // ── Summary ────────────────────────────────────────────────────
    const avgHealthScore = healthTrend.length
        ? Math.round(healthTrend.reduce((s, d) => s + d.score, 0) / healthTrend.length)
        : 0;

    const avgCalories = caloriesTrend.length
        ? Math.round(caloriesTrend.reduce((s, d) => s + d.actual, 0) / caloriesTrend.length)
        : 0;
    const caloriesPct = Math.round((avgCalories / CALORIE_GOAL) * 100);

    const waterDays = new Set(
        periodLogs.filter(l => l.type === "water")
            .map(l => startOfDay(new Date(l.created_at)).toDateString())
    ).size;
    const waterPct = Math.round((waterDays / Math.max(days, 1)) * 100);

    const sleepLogs = periodLogs.filter(l => l.type === "sleep");
    const sleepAvg = sleepLogs.length
        ? (sleepLogs.reduce((s, l) => s + (parseNumber(l.value) || 0), 0) / sleepLogs.length).toFixed(1)
        : 0;

    // ── Trends ────────────────────────────────────────────────────
    const prevHealthScore = prevLogs.length
        ? Math.round((new Set(prevLogs.map(l => l.type)).size / 8) * 100)
        : avgHealthScore;

    const prevMealLogs = prevLogs.filter(l => l.type === "meal");
    const prevAvgCal = prevMealLogs.length
        ? Math.round(prevMealLogs.reduce((s, l) => s + (parseNumber(l.value) || 0), 0) / prevMealLogs.length)
        : avgCalories;
    const prevCalPct = Math.round((prevAvgCal / CALORIE_GOAL) * 100);

    const prevWaterDays = new Set(
        prevLogs.filter(l => l.type === "water")
            .map(l => startOfDay(new Date(l.created_at)).toDateString())
    ).size;
    const prevWaterPct = Math.round((prevWaterDays / Math.max(days, 1)) * 100);

    const prevSleepLogs = prevLogs.filter(l => l.type === "sleep");
    const prevSleepAvg = prevSleepLogs.length
        ? parseFloat(
            (prevSleepLogs.reduce((s, l) => s + (parseNumber(l.value) || 0), 0) / prevSleepLogs.length).toFixed(1)
        )
        : parseFloat(sleepAvg);

    function safeTrend(curr, prev) {
        if (!prev) return 0;
        return Math.round(((curr - prev) / prev) * 100);
    }

    const trends = {
        healthScore: safeTrend(avgHealthScore, prevHealthScore),
        calories: safeTrend(caloriesPct, prevCalPct),
        water: safeTrend(waterPct, prevWaterPct),
        sleep: safeTrend(parseFloat(sleepAvg), prevSleepAvg),
    };

    // ── VitaAI Insights ───────────────────────────────────────────
    const insights = [];
    const workoutLogs = periodLogs.filter(l => l.type === "workout");

    if (waterPct >= 70) {
        insights.push({ icon: "💧", text: `Your hydration is strong — water logged on ${waterPct}% of days this period. Keep it up!` });
    } else {
        insights.push({ icon: "💧", text: `Hydration needs attention — only ${waterPct}% of days had a water log. Try to log daily.` });
    }

    if (parseFloat(sleepAvg) >= 7) {
        insights.push({ icon: "😴", text: `Great sleep! Averaging ${sleepAvg} hrs. Consistent rest is fuelling your recovery.` });
    } else if (parseFloat(sleepAvg) > 0) {
        insights.push({ icon: "😴", text: `Sleep average is ${sleepAvg} hrs — below the 7-hr target. Try a fixed bedtime.` });
    } else {
        insights.push({ icon: "😴", text: `No sleep logs found yet. Start tracking to get personalized sleep insights.` });
    }

    if (workoutLogs.length >= 3) {
        insights.push({ icon: "🏋️", text: `${workoutLogs.length} workout${workoutLogs.length > 1 ? "s" : ""} logged this period — great momentum. Keep building consistency!` });
    } else if (workoutLogs.length > 0) {
        insights.push({ icon: "🏋️", text: `${workoutLogs.length} workout logged this period. Aim for at least 3 sessions to build a habit.` });
    } else {
        insights.push({ icon: "🏋️", text: `No workouts logged this period. Even a short walk counts — start small!` });
    }

    return {
        healthTrend, caloriesTrend,
        summary: { healthScore: avgHealthScore, caloriesPct, waterPct, sleepScore: parseFloat(sleepAvg) },
        trends, insights,
    };
}

// ── Main Component ───────────────────────────────────────────────
export default function ReportsPage() {
    const [period, setPeriod] = useState("7");
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // ── reportRef: points to the entire page div ──────────────────
    // html2canvas will screenshot everything inside it
    const reportRef = useRef(null);

    useEffect(() => {
        fetchLogs()
            .then(data => setLogs(data))
            .catch(err => console.error("Failed to load logs:", err))
            .finally(() => setLoading(false));
    }, []);

    const analytics = useMemo(() => computeAnalytics(logs, period), [logs, period]);
    const { healthTrend, caloriesTrend, summary, trends, insights } = analytics;

    // ── PDF Download function ─────────────────────────────────────
    //
    // WHAT HAPPENS STEP BY STEP:
    //
    // 1. html2canvas(reportRef.current) — takes a screenshot of the
    //    entire <div ref={reportRef}> exactly as it looks on screen.
    //    scale:2 means 2x resolution (retina quality, sharper PDF).
    //    Returns a <canvas> element with pixel data.
    //
    // 2. canvas.toDataURL("image/png") — converts the canvas pixels
    //    into a PNG image encoded as a base64 string (a long text string
    //    that represents the image file).
    //
    // 3. new jsPDF(...) — creates a blank A4 PDF document in memory.
    //    A4 = 210mm wide × 297mm tall.
    //
    // 4. We calculate how tall the image will be when scaled to fit
    //    the 210mm PDF width. If the page is taller than 297mm,
    //    we split it across multiple PDF pages automatically.
    //
    // 5. pdf.save("VitaTrack_Report.pdf") — triggers browser download.
    //
    async function downloadReport() {
        if (!reportRef.current || downloading) return;

        try {
            setDownloading(true);

            // Step 1 — Screenshot the entire reports div
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,           // 2x pixel density = sharp PDF
                useCORS: true,        // allow cross-origin resources
                backgroundColor: "#FAFAF9",  // match TOKEN.bg, no transparency
                logging: false,       // silence html2canvas console logs
            });

            // Step 2 — Convert canvas to base64 PNG string
            const imgData = canvas.toDataURL("image/png");

            // Step 3 — Create blank A4 PDF
            const pdf = new jsPDF({
                orientation: "portrait",  // vertical page
                unit: "mm",        // millimeters
                format: "a4",        // 210 × 297 mm
            });

            // Step 4 — Calculate dimensions
            const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
            const pdfHeight = pdf.internal.pageSize.getHeight();  // 297mm
            const imgWidth = canvas.width;   // pixels (scale:2 so 2× screen width)
            const imgHeight = canvas.height;  // pixels

            // How many mm tall will the image be when scaled to fit 210mm width?
            const ratio = pdfWidth / imgWidth;
            const scaledH = imgHeight * ratio;  // total height of image in mm

            // Step 5 — Add image to PDF, splitting across pages if needed
            let yPosition = 0; // tracks how far down the image we've placed

            while (yPosition < scaledH) {
                pdf.addImage(
                    imgData,       // base64 PNG
                    "PNG",
                    0,             // x: start at left edge of page
                    -yPosition,    // y: negative shifts image up so current slice is visible
                    pdfWidth,      // width: fill full page width (210mm)
                    scaledH        // height: full image height (PDF clips to page boundary)
                );

                yPosition += pdfHeight; // advance by one page height

                if (yPosition < scaledH) {
                    pdf.addPage(); // add next page if more content remains
                }
            }

            // Step 6 — Trigger browser file download
            pdf.save("VitaTrack_Report.pdf");

        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setDownloading(false);
        }
    }

    // ── Summary cards ──────────────────────────────────────────────
    const CARDS = [
        {
            icon: "❤️",
            label: "Avg Health Score",
            value: summary.healthScore,
            unit: "/100",
            trend: trends.healthScore,
            pct: summary.healthScore,
            color: TOKEN.orange,
        },
        {
            icon: "🔥",
            label: "Calories Progress",
            value: `${summary.caloriesPct}%`,
            unit: "of goal",
            trend: trends.calories,
            pct: summary.caloriesPct,
            color: TOKEN.purple,
        },
        {
            icon: "💧",
            label: "Water Consistency",
            value: `${summary.waterPct}%`,
            unit: "days on track",
            trend: trends.water,
            pct: summary.waterPct,
            color: "#0EA5E9",
        },
        {
            icon: "🌙",
            label: "Sleep Quality",
            value: summary.sleepScore,
            unit: "hrs avg",
            trend: trends.sleep,
            pct: (summary.sleepScore / 9) * 100,
            color: "#8B5CF6",
        },
    ];

    return (
        // ref={reportRef} — this div is what gets captured as the PDF screenshot
        <div
            ref={reportRef}
            style={{
                minHeight: "100vh",
                background: TOKEN.bg,
                padding: "40px 32px 80px",
                fontFamily: "'DM Sans', 'Figtree', sans-serif",
                color: TOKEN.text,
                boxSizing: "border-box",
                maxWidth: 1100,
                margin: "0 auto",
            }}
        >

            {/* ── Google Fonts ── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');

        * { box-sizing: border-box; }

        .filter-btn {
          padding: 7px 18px;
          border-radius: 99px;
          border: 1.5px solid ${TOKEN.border};
          background: ${TOKEN.white};
          color: ${TOKEN.muted};
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .filter-btn:hover { border-color: ${TOKEN.orange}; color: ${TOKEN.orange}; }
        .filter-btn.active {
          background: ${TOKEN.orange};
          border-color: ${TOKEN.orange};
          color: #fff;
          font-weight: 600;
        }

        .vita-card {
          background: ${TOKEN.white};
          border-radius: 20px;
          border: 1px solid ${TOKEN.border};
          box-shadow: 0 2px 12px rgba(0,0,0,0.045);
          padding: 28px 26px;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .vita-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.09);
          transform: translateY(-2px);
        }

        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 99px;
          border: none;
          background: linear-gradient(135deg, ${TOKEN.orange}, ${TOKEN.purple});
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .download-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
        .download-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>

            {/* ─────────────────────────────────── */}
            {/* SECTION 1 — Header                  */}
            {/* ─────────────────────────────────── */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 40,
                flexWrap: "wrap",
                gap: 16,
            }}>
                <div>
                    <p style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: TOKEN.orange,
                        marginBottom: 6,
                    }}>
                        Analytics
                    </p>
                    <h1 style={{
                        margin: 0,
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: "clamp(28px, 4vw, 38px)",
                        fontWeight: 400,
                        letterSpacing: "-0.5px",
                        lineHeight: 1.1,
                    }}>
                        Health Reports
                    </h1>
                    <p style={{ margin: "8px 0 0", fontSize: 14, color: TOKEN.muted }}>
                        {loading
                            ? "Loading your data..."
                            : `${logs.length} total log${logs.length !== 1 ? "s" : ""} · analytics from your real data`}
                    </p>
                </div>

                {/* Period filter */}
                <div style={{ display: "flex", gap: 8 }}>
                    {[["7", "7 Days"], ["30", "30 Days"], ["90", "90 Days"]].map(([val, label]) => (
                        <button
                            key={val}
                            className={`filter-btn${period === val ? " active" : ""}`}
                            onClick={() => setPeriod(val)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading / empty state */}
            {loading ? (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: 200, color: TOKEN.muted, fontSize: 14,
                }}>
                    Loading analytics...
                </div>
            ) : logs.length === 0 ? (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: 200, color: TOKEN.muted, fontSize: 14,
                    flexDirection: "column", gap: 8,
                }}>
                    <span style={{ fontSize: 32 }}>📋</span>
                    <p style={{ margin: 0 }}>No logs yet. Add logs from the Logs page to see reports.</p>
                </div>
            ) : (
                <>
                    {/* ─────────────────────────────────── */}
                    {/* SECTION 2 — Summary Cards           */}
                    {/* ─────────────────────────────────── */}
                    <div className="summary-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 18,
                        marginBottom: 40,
                    }}>
                        {CARDS.map((c) => (
                            <div key={c.label} className="vita-card">
                                <div style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 14,
                                    background: `${c.color}14`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 20,
                                    marginBottom: 16,
                                }}>
                                    {c.icon}
                                </div>

                                <div style={{
                                    fontFamily: "'DM Serif Display', serif",
                                    fontSize: "clamp(26px, 3vw, 34px)",
                                    fontWeight: 400,
                                    lineHeight: 1,
                                    color: TOKEN.text,
                                }}>
                                    {c.value}
                                    <span style={{
                                        fontSize: 13,
                                        fontFamily: "'DM Sans', sans-serif",
                                        color: TOKEN.muted,
                                        fontWeight: 400,
                                        marginLeft: 4,
                                    }}>
                                        {c.unit}
                                    </span>
                                </div>

                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginTop: 6,
                                }}>
                                    <span style={{ fontSize: 12, color: TOKEN.muted }}>{c.label}</span>
                                    <TrendBadge value={c.trend} />
                                </div>

                                <MiniBar pct={c.pct} color={c.color} />
                            </div>
                        ))}
                    </div>

                    {/* ─────────────────────────────────── */}
                    {/* SECTION 3 — Charts                  */}
                    {/* ─────────────────────────────────── */}
                    <div className="chart-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 20,
                        marginBottom: 40,
                    }}>
                        {/* Chart 1 — Health Score Trend */}
                        <div className="vita-card">
                            <div style={{ marginBottom: 24 }}>
                                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.2px" }}>
                                    Health Score Trend
                                </h2>
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: TOKEN.muted }}>
                                    Daily wellness index (based on log variety)
                                </p>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={healthTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                                    <CartesianGrid stroke={TOKEN.border} strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: TOKEN.muted }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: TOKEN.muted }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <defs>
                                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor={TOKEN.orange} />
                                            <stop offset="100%" stopColor={TOKEN.purple} />
                                        </linearGradient>
                                    </defs>
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="url(#lineGrad)"
                                        strokeWidth={2.5}
                                        dot={{ fill: TOKEN.orange, strokeWidth: 0, r: 4 }}
                                        activeDot={{ r: 6, fill: TOKEN.purple, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Chart 2 — Calories vs Goal */}
                        <div className="vita-card">
                            <div style={{ marginBottom: 24 }}>
                                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.2px" }}>
                                    Calories vs Goal
                                </h2>
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: TOKEN.muted }}>
                                    Actual intake vs 2 000 kcal target
                                </p>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={caloriesTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barCategoryGap="35%">
                                    <CartesianGrid stroke={TOKEN.border} strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: TOKEN.muted }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 2400]} tick={{ fontSize: 11, fill: TOKEN.muted }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <defs>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={TOKEN.purple} stopOpacity={0.85} />
                                            <stop offset="100%" stopColor={TOKEN.purple} stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="barGoal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={TOKEN.orangeMid} stopOpacity={0.5} />
                                            <stop offset="100%" stopColor={TOKEN.orangeMid} stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <Bar dataKey="goal" name="Goal" fill="url(#barGoal)" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="actual" name="Actual" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>

                            <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "flex-end" }}>
                                {[["Goal", TOKEN.orangeMid], ["Actual", TOKEN.purple]].map(([l, c]) => (
                                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TOKEN.muted }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                                        {l}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─────────────────────────────────── */}
                    {/* SECTION 4 — VitaAI Insight          */}
                    {/* ─────────────────────────────────── */}
                    <div className="vita-card" style={{ padding: "36px 36px 32px" }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 28,
                            flexWrap: "wrap",
                            gap: 16,
                        }}>
                            <div>
                                <h2 style={{
                                    margin: 0,
                                    fontFamily: "'DM Serif Display', serif",
                                    fontSize: 20,
                                    fontWeight: 400,
                                    letterSpacing: "-0.3px",
                                }}>
                                    VitaAI Insight <span role="img" aria-label="brain">🧠</span>
                                </h2>
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: TOKEN.muted }}>
                                    Personalised from your recent data
                                </p>
                            </div>

                            {/* Download Report — onClick wired to downloadReport() */}
                            <button
                                className="download-btn"
                                onClick={downloadReport}
                                disabled={downloading}
                            >
                                {downloading ? (
                                    "Generating..."
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Download Report
                                    </>
                                )}
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {insights.map((ins, i) => (
                                <div key={i} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    padding: "16px 20px",
                                    borderRadius: 14,
                                    background: i === 0 ? TOKEN.orangeLight : i === 1 ? "#FEF3F2" : TOKEN.purpleLight,
                                    border: `1px solid ${i === 0 ? TOKEN.orangeMid + "55" : i === 1 ? "#FECACA" : TOKEN.purpleMid + "55"}`,
                                }}>
                                    <span style={{ fontSize: 22 }}>{ins.icon}</span>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>
                                        {ins.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}