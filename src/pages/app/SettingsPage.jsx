import { useState } from "react";
import { Bell, Moon, Shield, Trash2, ChevronRight } from "lucide-react";

const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? "bg-gradient-to-r from-[#E63A1E] to-[#FF7A00]" : "bg-white/10"}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value ? "left-6" : "left-1"}`} />
    </button>
);

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: true,
        waterReminder: true,
        medicineReminder: true,
        workoutReminder: false,
        sleepReminder: true,
    });

    const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

    const sections = [
        {
            title: "Notifications",
            icon: Bell,
            items: [
                { label: "Push Notifications", key: "notifications" },
                { label: "Water Reminders", key: "waterReminder" },
                { label: "Medicine Reminders", key: "medicineReminder" },
                { label: "Workout Reminders", key: "workoutReminder" },
                { label: "Sleep Reminders", key: "sleepReminder" },
            ],
        },
        {
            title: "Appearance",
            icon: Moon,
            items: [{ label: "Dark Mode", key: "darkMode" }],
        },
    ];

    return (
        <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>Settings</h1>
                <p className="text-white/40 text-sm mt-1">Manage your preferences</p>
            </div>

            {sections.map(({ title, icon: Icon, items }) => (
                <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Icon className="w-4 h-4 text-[#FF7A00]" />
                        <h3 className="text-white font-semibold text-sm" style={{ fontFamily: "Playfair Display, serif" }}>{title}</h3>
                    </div>
                    <div className="space-y-4">
                        {items.map(({ label, key }) => (
                            <div key={key} className="flex items-center justify-between">
                                <span className="text-white/70 text-sm">{label}</span>
                                <Toggle value={settings[key]} onChange={() => toggle(key)} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-red-400" />
                    <h3 className="text-red-400 font-semibold text-sm" style={{ fontFamily: "Playfair Display, serif" }}>Danger Zone</h3>
                </div>
                <button className="flex items-center justify-between w-full text-red-400 text-sm hover:opacity-80 transition">
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                    </div>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}