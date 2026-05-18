import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const T = {
    orange: "#F97316", orangeLight: "#FFF7ED", orangeMid: "#FDBA74",
    purple: "#7C3AED", purpleLight: "#F5F3FF", purpleMid: "#C4B5FD",
    text: "#1C1917", muted: "#78716C", border: "#F0EBE5",
    bg: "#FAFAF9", white: "#FFFFFF",
    green: "#16A34A", greenLight: "#F0FDF4",
    sky: "#0EA5E9", skyLight: "#F0F9FF",
};

const GOALS_CONFIG = [
    { icon: "⚖️", label: "Target Weight", key: "target_weight", placeholder: "e.g. 65 kg" },
    { icon: "👟", label: "Daily Steps", key: "daily_steps_goal", placeholder: "e.g. 10000" },
    { icon: "💧", label: "Water Goal", key: "water_goal", placeholder: "e.g. 2.5 L" },
    { icon: "🌙", label: "Sleep Goal", key: "sleep_goal", placeholder: "e.g. 8 hrs" },
    { icon: "🔥", label: "Calories Goal", key: "calories_goal", placeholder: "e.g. 2000 kcal" },
    { icon: "💪", label: "Protein Goal", key: "protein_goal", placeholder: "e.g. 120 g" },
];

const INFO_FIELDS = [
    { label: "Full Name", key: "full_name", type: "text", readonly: false },
    { label: "Email", key: "email", type: "email", readonly: true },
    { label: "Mobile", key: "mobile", type: "tel", readonly: false },
    { label: "Age", key: "age", type: "number", readonly: false },
    { label: "Height", key: "height", type: "text", readonly: false, placeholder: "e.g. 5'6\"" },
    { label: "Weight", key: "weight", type: "text", readonly: false, placeholder: "e.g. 62 kg" },
    { label: "Blood Group", key: "blood_group", type: "text", readonly: false, placeholder: "e.g. B+" },
];

function FemaleAvatar() {
    return (
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <circle cx="60" cy="60" r="60" fill="url(#fg)" />
            <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F97316" /><stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
            </defs>
            <path d="M30 114 Q32 82 60 80 Q88 82 90 114 Z" fill="white" fillOpacity="0.25" />
            <rect x="53" y="68" width="14" height="14" rx="4" fill="#FDDCB5" />
            <ellipse cx="60" cy="51" rx="18" ry="20" fill="#FDDCB5" />
            <ellipse cx="60" cy="34" rx="20" ry="11" fill="#3B1F0A" />
            <path d="M40 44 Q36 62 40 76" stroke="#3B1F0A" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M80 44 Q84 62 80 76" stroke="#3B1F0A" strokeWidth="8" strokeLinecap="round" fill="none" />
            <ellipse cx="53" cy="51" rx="3" ry="3.5" fill="#2D1A0E" />
            <ellipse cx="67" cy="51" rx="3" ry="3.5" fill="#2D1A0E" />
            <path d="M53 60 Q60 66 67 60" stroke="#C0845A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
    );
}

function MaleAvatar() {
    return (
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <circle cx="60" cy="60" r="60" fill="url(#mg)" />
            <defs>
                <linearGradient id="mg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7C3AED" /><stop offset="1" stopColor="#F97316" />
                </linearGradient>
            </defs>
            <rect x="34" y="78" width="52" height="36" rx="12" fill="white" fillOpacity="0.25" />
            <rect x="53" y="68" width="14" height="14" rx="4" fill="#FDDCB5" />
            <ellipse cx="60" cy="52" rx="18" ry="20" fill="#FDDCB5" />
            <ellipse cx="60" cy="35" rx="18" ry="10" fill="#4B3B2A" />
            <rect x="42" y="35" width="36" height="10" fill="#4B3B2A" />
            <ellipse cx="53" cy="52" rx="3" ry="3.5" fill="#2D1A0E" />
            <ellipse cx="67" cy="52" rx="3" ry="3.5" fill="#2D1A0E" />
            <path d="M53 61 Q60 67 67 61" stroke="#C0845A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.35)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
        }}>
            <div style={{
                background: T.white, borderRadius: 20, padding: 32,
                width: "100%", maxWidth: 440,
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                fontFamily: "'DM Sans', sans-serif",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{title}</h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.muted, lineHeight: 1 }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();

    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState({});

    const [goalsMode, setGoalsMode] = useState(false);
    const [goalsSaving, setGoalsSaving] = useState(false);
    const [goalsDraft, setGoalsDraft] = useState({});

    const [achievements, setAchievements] = useState(null);

    const [modal, setModal] = useState(null);
    const [modalSaving, setModalSaving] = useState(false);

    const [pwData, setPwData] = useState({ current_password: "", new_password: "", confirm_password: "" });

    const [notifData, setNotifData] = useState({
        water_reminders: false,
        workout_reminders: false,
        sleep_reminders: false,
        medicine_reminders: false,
    });

    const [privacyData, setPrivacyData] = useState({
        profile_visibility: true,
        analytics_sharing: true,
        ai_personalization: true,
    });

    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); };
    const showError = (msg) => setError(msg);
    const clearAlerts = () => { setSuccess(""); setError(""); };

    useEffect(() => {
        if (user) {
            setDraft({ ...user });
            setGoalsDraft({ ...user });
        }
    }, [user]);

    useEffect(() => {
        api.get("/api/users/achievements")
            .then(res => setAchievements(res.data))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (modal === "notifications") {
            api.get("/api/users/notifications")
                .then(res => setNotifData(res.data))
                .catch(() => { });
        }
        if (modal === "privacy") {
            api.get("/api/users/privacy")
                .then(res => setPrivacyData(res.data))
                .catch(() => { });
        }
        if (modal) {
            clearAlerts();
            setPwData({ current_password: "", new_password: "", confirm_password: "" });
        }
    }, [modal]);

    if (!user) {
        return (
            <div style={{ padding: 60, textAlign: "center", color: T.muted, fontFamily: "DM Sans, sans-serif" }}>
                Loading profile...
            </div>
        );
    }

    const isFemale = (draft.gender || "").toLowerCase() === "female";
    const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));

    const handleSave = async () => {
        setSaving(true);
        clearAlerts();
        try {
            const payload = {
                gender: draft.gender || null,
                age: draft.age ? Number(draft.age) : null,
                height: draft.height || null,
                weight: draft.weight || null,
                blood_group: draft.blood_group || null,
                full_name: draft.full_name || null,
                mobile: draft.mobile || null,
            };
            await api.put("/api/users/profile", payload);
            await refreshUser();
            setEditMode(false);
            showSuccess("Profile saved successfully!");
        } catch (err) {
            const detail = err.response?.data?.detail;
            showError(typeof detail === "string" ? detail : "Failed to save. Try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setDraft({ ...user });
        setEditMode(false);
        clearAlerts();
    };

    // ── Save: Health Goals ─────────────────────────────────────────────
    const handleGoalsSave = async () => {
        setGoalsSaving(true);
        clearAlerts();
        try {
            const payload = {
                target_weight: goalsDraft.target_weight || null,
                daily_steps_goal: goalsDraft.daily_steps_goal ? Number(goalsDraft.daily_steps_goal) : null,
                water_goal: goalsDraft.water_goal || null,
                sleep_goal: goalsDraft.sleep_goal || null,
                calories_goal: goalsDraft.calories_goal ? Number(goalsDraft.calories_goal) : null,
                protein_goal: goalsDraft.protein_goal ? Number(goalsDraft.protein_goal) : null,
            };
            await api.put("/api/users/profile", payload);
            await refreshUser();
            api.get("/api/users/achievements").then(res => setAchievements(res.data)).catch(() => { });
            setGoalsMode(false);
            showSuccess("Goals saved successfully!");
        } catch (err) {
            const detail = err.response?.data?.detail;
            showError(typeof detail === "string" ? detail : "Failed to save goals. Try again.");
        } finally {
            setGoalsSaving(false);
        }
    };

    const handleGoalsCancel = () => {
        setGoalsDraft({ ...user });
        setGoalsMode(false);
        clearAlerts();
    };

    const handlePasswordSave = async () => {
        clearAlerts();
        if (!pwData.current_password || !pwData.new_password || !pwData.confirm_password) {
            showError("Please fill in all fields."); return;
        }
        if (pwData.new_password.length < 8) {
            showError("New password must be at least 8 characters."); return;
        }
        if (pwData.new_password !== pwData.confirm_password) {
            showError("New passwords do not match."); return;
        }
        setModalSaving(true);
        try {
            await api.post("/api/users/change-password", {
                current_password: pwData.current_password,
                new_password: pwData.new_password,
            });
            setModal(null);
            showSuccess("Password changed successfully!");
        } catch (err) {
            const detail = err.response?.data?.detail;
            showError(typeof detail === "string" ? detail : "Failed to change password.");
        } finally {
            setModalSaving(false);
        }
    };

    const handleNotifSave = async () => {
        setModalSaving(true);
        clearAlerts();
        try {
            await api.put("/api/users/notifications", notifData);
            setModal(null);
            showSuccess("Notification settings saved!");
        } catch {
            showError("Failed to save notification settings.");
        } finally {
            setModalSaving(false);
        }
    };

    const handlePrivacySave = async () => {
        setModalSaving(true);
        clearAlerts();
        try {
            await api.put("/api/users/privacy", privacyData);
            setModal(null);
            showSuccess("Privacy settings saved!");
        } catch {
            showError("Failed to save privacy settings.");
        } finally {
            setModalSaving(false);
        }
    };

    const Toggle = ({ value, onChange }) => (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: 44, height: 24, borderRadius: 99, cursor: "pointer",
                background: value ? T.orange : T.border,
                position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
        >
            <div style={{
                position: "absolute", top: 3,
                left: value ? 23 : 3,
                width: 18, height: 18, borderRadius: "50%",
                background: T.white,
                transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }} />
        </div>
    );

    const inputStyle = {
        width: "100%", padding: "10px 14px",
        border: `1.5px solid ${T.border}`, borderRadius: 10,
        fontSize: 14, fontFamily: "inherit", color: T.text,
        background: T.bg, outline: "none", marginBottom: 14,
        boxSizing: "border-box",
    };

    const modalBtnStyle = (primary) => ({
        padding: "10px 24px", borderRadius: 99, fontSize: 13,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        border: primary ? "none" : `1.5px solid ${T.border}`,
        background: primary ? `linear-gradient(135deg,${T.orange},${T.purple})` : T.white,
        color: primary ? "#fff" : T.text,
        opacity: modalSaving ? 0.65 : 1,
    });

    return (
        <div style={{
            minHeight: "100vh", background: T.bg,
            padding: "40px 32px 80px",
            fontFamily: "'DM Sans', sans-serif",
            color: T.text, maxWidth: 1000,
            margin: "0 auto", boxSizing: "border-box",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .v-card { background:${T.white}; border:1px solid ${T.border}; border-radius:24px; box-shadow:0 2px 14px rgba(0,0,0,0.042); padding:36px; margin-bottom:24px; }
        .v-input { width:100%; padding:10px 14px; border:1.5px solid ${T.border}; border-radius:10px; font-size:14px; font-family:inherit; color:${T.text}; background:${T.bg}; outline:none; transition:border-color 0.2s; }
        .v-input:focus { border-color:${T.orange}; }
        .v-input[readonly] { opacity:0.55; cursor:not-allowed; }
        .v-select { width:100%; padding:10px 14px; border:1.5px solid ${T.border}; border-radius:10px; font-size:14px; font-family:inherit; color:${T.text}; background:${T.bg}; outline:none; cursor:pointer; }
        .v-select:focus { border-color:${T.orange}; }
        .edit-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 22px; border-radius:99px; border:1.5px solid ${T.border}; background:${T.white}; color:${T.text}; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .edit-btn:hover { border-color:${T.orange}; color:${T.orange}; }
        .save-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 26px; border-radius:99px; border:none; background:linear-gradient(135deg,${T.orange},${T.purple}); color:#fff; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .save-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(124,58,237,0.3); }
        .save-btn:disabled { opacity:0.65; cursor:not-allowed; }
        .field-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .goals-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .badges-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .settings-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        @media(max-width:760px){
          .field-grid  { grid-template-columns:1fr 1fr !important; }
          .goals-grid  { grid-template-columns:1fr !important; }
          .badges-grid { grid-template-columns:1fr 1fr !important; }
          .settings-grid { grid-template-columns:1fr !important; }
          .avatar-row  { flex-direction:column !important; align-items:flex-start !important; }
        }
        @media(max-width:440px){
          .field-grid { grid-template-columns:1fr !important; }
          .badges-grid { grid-template-columns:1fr !important; }
          .v-card { padding:22px 16px !important; }
        }
      `}</style>

            {/* ── Alerts ── */}
            {success && (
                <div style={{ background: T.greenLight, border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: T.green, marginBottom: 20 }}>
                    ✓ {success}
                </div>
            )}
            {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: "#DC2626", marginBottom: 20 }}>
                    ⚠ {error}
                </div>
            )}

            {/* ════════════════════════════════════ */}
            {/* SECTION 1 — Personal Profile         */}
            {/* ════════════════════════════════════ */}
            <div className="v-card">
                <div className="avatar-row" style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30 }}>
                    <div style={{
                        width: 92, height: 92, borderRadius: "50%",
                        overflow: "hidden", flexShrink: 0,
                        boxShadow: `0 0 0 4px ${T.white}, 0 0 0 6px ${isFemale ? T.orange : T.purple}33`,
                    }}>
                        {isFemale ? <FemaleAvatar /> : <MaleAvatar />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(20px,3vw,26px)", fontWeight: 400, margin: 0, letterSpacing: "-0.4px" }}>
                                {user.full_name}
                            </h1>
                            {user.blood_group && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 99, padding: "2px 9px" }}>
                                    {user.blood_group}
                                </span>
                            )}
                            {user.profile_complete && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: T.green, background: T.greenLight, border: "1px solid #BBF7D0", borderRadius: 99, padding: "2px 9px" }}>
                                    ✓ Profile Complete
                                </span>
                            )}
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.email} · {user.mobile}
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                        {editMode ? (
                            <>
                                <button className="edit-btn" onClick={handleCancel}>Cancel</button>
                                <button className="save-btn" onClick={handleSave} disabled={saving}>
                                    {saving ? "Saving..." : "✓ Save"}
                                </button>
                            </>
                        ) : (
                            <button className="edit-btn" onClick={() => setEditMode(true)}>
                                ✏️ Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                <div className="field-grid">
                    {INFO_FIELDS.map((f) => (
                        <div key={f.key}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 5 }}>
                                {f.label}
                            </div>
                            {editMode && !f.readonly ? (
                                <input
                                    className="v-input"
                                    type={f.type}
                                    value={draft[f.key] || ""}
                                    placeholder={f.placeholder || ""}
                                    onChange={(e) => set(f.key, e.target.value)}
                                />
                            ) : (
                                <div style={{ fontSize: 14, fontWeight: 600, padding: "10px 0", color: T.text }}>
                                    {user[f.key] || <span style={{ color: T.muted, fontWeight: 400 }}>—</span>}
                                </div>
                            )}
                        </div>
                    ))}

                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 5 }}>
                            Gender
                        </div>
                        {editMode ? (
                            <select className="v-select" value={draft.gender || ""} onChange={(e) => set("gender", e.target.value)}>
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        ) : (
                            <div style={{ fontSize: 14, fontWeight: 600, padding: "10px 0" }}>
                                {user.gender
                                    ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
                                    : <span style={{ color: T.muted, fontWeight: 400 }}>—</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════ */}
            {/* SECTION 2 — Health Goals             */}
            {/* ════════════════════════════════════ */}
            <div className="v-card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>
                        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, fontWeight: 400, margin: "0 0 4px", letterSpacing: "-0.3px" }}>
                            Health Goals 🎯
                        </h2>
                        <p style={{ fontSize: 12, color: T.muted, margin: "0 0 24px" }}>Your active wellness targets</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                        {goalsMode ? (
                            <>
                                <button className="edit-btn" onClick={handleGoalsCancel}>Cancel</button>
                                <button className="save-btn" onClick={handleGoalsSave} disabled={goalsSaving}>
                                    {goalsSaving ? "Saving..." : "✓ Save Goals"}
                                </button>
                            </>
                        ) : (
                            <button className="edit-btn" onClick={() => setGoalsMode(true)}>
                                🎯 Edit Goals
                            </button>
                        )}
                    </div>
                </div>

                <div className="goals-grid">
                    {GOALS_CONFIG.map((g) => (
                        <div key={g.key} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.orange}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                                    {g.icon}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>{g.label}</span>
                            </div>
                            {goalsMode ? (
                                <input
                                    className="v-input"
                                    type="text"
                                    value={goalsDraft[g.key] || ""}
                                    placeholder={g.placeholder}
                                    onChange={(e) => setGoalsDraft((d) => ({ ...d, [g.key]: e.target.value }))}
                                />
                            ) : (
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                    {user[g.key]
                                        ? String(user[g.key])
                                        : <span style={{ fontSize: 13, color: T.muted, fontWeight: 400 }}>Not set</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ════════════════════════════════════ */}
            {/* SECTION 3 — Achievements             */}
            {/* ════════════════════════════════════ */}
            <div className="v-card">
                <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, fontWeight: 400, margin: "0 0 4px", letterSpacing: "-0.3px" }}>
                    Achievements 🏆
                </h2>
                <p style={{ fontSize: 12, color: T.muted, margin: "0 0 24px" }}>Badges earned through consistency</p>

                <div className="badges-grid">
                    {[
                        {
                            icon: "🔥", label: "Current Streak",
                            value: achievements ? `${achievements.streak} Days` : "—",
                            badge: achievements?.streak >= 7 ? "On Fire" : achievements?.streak >= 3 ? "Warming Up" : "Starting",
                            bg: T.orangeLight, color: T.orange, border: `${T.orangeMid}55`
                        },
                        {
                            icon: "💧", label: "Water Consistency",
                            value: achievements ? `${achievements.water_consistency}%` : "—",
                            badge: achievements?.water_consistency >= 70 ? "Hydrated" : "Keep Going",
                            bg: T.skyLight, color: T.sky, border: "#7DD3FC55"
                        },
                        {
                            icon: "🏋️", label: "Workout Consistency",
                            value: achievements ? `${achievements.workout_consistency}%` : "—",
                            badge: achievements?.workout_consistency >= 50 ? "Active" : "Building",
                            bg: T.purpleLight, color: T.purple, border: `${T.purpleMid}55`
                        },
                        {
                            icon: "😴", label: "Sleep Consistency",
                            value: achievements ? `${achievements.sleep_consistency}%` : "—",
                            badge: achievements?.sleep_consistency >= 70 ? "Resting" : "Improving",
                            bg: "#F5F3FF", color: "#8B5CF6", border: "#C4B5FD55"
                        },
                    ].map((a) => (
                        <div key={a.label} style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 18, padding: "20px 18px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: a.color, background: `${a.color}20`, borderRadius: 99, padding: "2px 9px", marginBottom: 12 }}>
                                ✦ {a.badge}
                            </div>
                            <div style={{ fontSize: 28 }}>{a.icon}</div>
                            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, fontWeight: 400, margin: "6px 0 2px" }}>{a.value}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ════════════════════════════════════ */}
            {/* SECTION 4 — Account Settings         */}
            {/* ════════════════════════════════════ */}
            <div className="v-card" style={{ marginBottom: 0 }}>
                <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, fontWeight: 400, margin: "0 0 4px", letterSpacing: "-0.3px" }}>
                    Account Settings ⚙️
                </h2>
                <p style={{ fontSize: 12, color: T.muted, margin: "0 0 24px" }}>Manage your preferences</p>

                <div className="settings-grid">
                    {[
                        { icon: "✏️", label: "Edit Profile", sub: "Update personal details", color: T.orange, bg: T.orangeLight, action: () => { setEditMode(true); window.scrollTo({ top: 0, behavior: "smooth" }); } },
                        { icon: "🔒", label: "Change Password", sub: "Secure your account", color: T.purple, bg: T.purpleLight, action: () => setModal("password") },
                        { icon: "🔔", label: "Notifications", sub: "Manage alerts & reminders", color: T.sky, bg: T.skyLight, action: () => setModal("notifications") },
                        { icon: "🛡️", label: "Privacy Settings", sub: "Data & visibility", color: T.green, bg: T.greenLight, action: () => setModal("privacy") },
                    ].map((s) => (
                        <button key={s.label} onClick={s.action}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", borderRadius: 16, border: `1px solid ${T.border}`, background: T.white, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%", transition: "all 0.2s ease" }}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: 13, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                                {s.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</div>
                                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{s.sub}</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 3l5 5-5 5" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>

            {/* ════════════════════════════════════ */}
            {/* MODAL — Change Password              */}
            {/* ════════════════════════════════════ */}
            {modal === "password" && (
                <Modal title="🔒 Change Password" onClose={() => setModal(null)}>
                    <input
                        style={inputStyle} type="password"
                        placeholder="Current password"
                        value={pwData.current_password}
                        onChange={(e) => setPwData(d => ({ ...d, current_password: e.target.value }))}
                    />
                    <input
                        style={inputStyle} type="password"
                        placeholder="New password (min 8 characters)"
                        value={pwData.new_password}
                        onChange={(e) => setPwData(d => ({ ...d, new_password: e.target.value }))}
                    />
                    <input
                        style={{ ...inputStyle, marginBottom: 20 }} type="password"
                        placeholder="Confirm new password"
                        value={pwData.confirm_password}
                        onChange={(e) => setPwData(d => ({ ...d, confirm_password: e.target.value }))}
                    />
                    {error && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 14 }}>⚠ {error}</div>}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button style={modalBtnStyle(false)} onClick={() => setModal(null)}>Cancel</button>
                        <button style={modalBtnStyle(true)} onClick={handlePasswordSave} disabled={modalSaving}>
                            {modalSaving ? "Saving..." : "Change Password"}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ════════════════════════════════════ */}
            {/* MODAL — Notifications                */}
            {/* ════════════════════════════════════ */}
            {modal === "notifications" && (
                <Modal title="🔔 Notification Settings" onClose={() => setModal(null)}>
                    {[
                        { key: "water_reminders", label: "Water Reminders", sub: "Remind me to drink water" },
                        { key: "workout_reminders", label: "Workout Reminders", sub: "Remind me to exercise" },
                        { key: "sleep_reminders", label: "Sleep Reminders", sub: "Remind me to sleep on time" },
                        { key: "medicine_reminders", label: "Medicine Reminders", sub: "Remind me to take medicine" },
                    ].map((item) => (
                        <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: T.muted }}>{item.sub}</div>
                            </div>
                            <Toggle
                                value={notifData[item.key]}
                                onChange={(val) => setNotifData(d => ({ ...d, [item.key]: val }))}
                            />
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                        <button style={modalBtnStyle(false)} onClick={() => setModal(null)}>Cancel</button>
                        <button style={modalBtnStyle(true)} onClick={handleNotifSave} disabled={modalSaving}>
                            {modalSaving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ════════════════════════════════════ */}
            {/* MODAL — Privacy Settings             */}
            {/* ════════════════════════════════════ */}
            {modal === "privacy" && (
                <Modal title="🛡️ Privacy Settings" onClose={() => setModal(null)}>
                    {[
                        { key: "profile_visibility", label: "Profile Visibility", sub: "Allow others to view your profile" },
                        { key: "analytics_sharing", label: "Analytics Sharing", sub: "Share anonymized health data" },
                        { key: "ai_personalization", label: "AI Personalization", sub: "Allow AI to learn from your logs" },
                    ].map((item) => (
                        <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: T.muted }}>{item.sub}</div>
                            </div>
                            <Toggle
                                value={privacyData[item.key]}
                                onChange={(val) => setPrivacyData(d => ({ ...d, [item.key]: val }))}
                            />
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                        <button style={modalBtnStyle(false)} onClick={() => setModal(null)}>Cancel</button>
                        <button style={modalBtnStyle(true)} onClick={handlePrivacySave} disabled={modalSaving}>
                            {modalSaving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}