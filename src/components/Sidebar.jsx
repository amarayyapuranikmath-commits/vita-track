import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ClipboardList,
    Bell,
    Brain,
    BarChart3,
    User,
    LogOut,
    Heart,
    Activity
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

const menu = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Logs", icon: ClipboardList, path: "/logs" },
    { label: "Reminders", icon: Bell, path: "/reminders" },
    { label: "AI Coach", icon: Brain, path: "/ai-coach" },
    { label: "Reports", icon: BarChart3, path: "/reports" },
];

const bottom = [
    { label: "Profile", icon: User, path: "/profile" },
];

export default function Sidebar() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <aside
            className="w-[220px] min-w-[220px] bg-white border-r border-[#E5E7EB] flex flex-col py-6 px-3 overflow-y-auto"
            style={{ boxShadow: "2px 0 20px rgba(0,0,0,0.04)" }}
        >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-3 mb-8">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center relative"
                    style={{ background: "linear-gradient(135deg, #FF6B00, #FFB347)" }}
                >
                    <Heart className="w-4 h-4 text-white" fill="white" />
                    <Activity
                        className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5"
                        style={{ filter: "drop-shadow(0 0 2px rgba(255,107,0,0.8))" }}
                    />
                </div>
                <div>
                    <p
                        className="text-[#111827] font-bold text-base leading-none"
                        style={{ fontFamily: "Playfair Display, serif" }}
                    >
                        VitaTrack
                    </p>
                    <p className="text-[#6B7280] text-[10px] mt-0.5">Health Platform</p>
                </div>
            </div>

            {/* Main Menu */}
            <nav className="flex flex-col gap-1 flex-1">
                <p className="text-[#6B7280] text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
                    Main
                </p>
                {menu.map(({ label, icon: Icon, path }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-orange-50 text-[#FF6B00]"
                                : "text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-[#FF6B00]/10" : "bg-transparent"
                                        }`}
                                    style={
                                        isActive
                                            ? { boxShadow: "0 0 12px rgba(255,107,0,0.25)" }
                                            : {}
                                    }
                                >
                                    <Icon
                                        className="w-4 h-4"
                                        style={{ color: isActive ? "#FF6B00" : "currentColor" }}
                                    />
                                </div>
                                <span>{label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="ml-auto w-1.5 h-5 rounded-full bg-[#FF6B00]"
                                        style={{ boxShadow: "0 0 8px rgba(255,107,0,0.6)" }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Menu */}
            <div className="flex flex-col gap-1 border-t border-[#E5E7EB] pt-4 mt-4">
                <p className="text-[#6B7280] text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
                    Account
                </p>
                {bottom.map(({ label, icon: Icon, path }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-orange-50 text-[#FF6B00]"
                                : "text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-[#FF6B00]/10" : ""}`}>
                                    <Icon className="w-4 h-4" style={{ color: isActive ? "#FF6B00" : "currentColor" }} />
                                </div>
                                {label}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-all duration-200 w-full text-left mt-1"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                    </div>
                    Logout
                </button>
            </div>

            {/* User Card at bottom */}
            <div className="mt-4 mx-1 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B00] to-[#FFB347] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                            {user?.name?.[0]?.toUpperCase() || "V"}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[#111827] text-xs font-semibold truncate">{user?.name || "User"}</p>
                        <p className="text-[#6B7280] text-[10px] truncate">{user?.email || "user@vitatrack.com"}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}