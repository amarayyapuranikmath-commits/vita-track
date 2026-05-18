import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const successMsg = location.state?.message || "";

    const [form, setForm] = useState({ identifier: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(form);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail.map((d) => d.msg).join(", "));
            } else {
                setError(detail || "Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-[#F0EBE5] px-10 py-12">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-3xl mx-auto mb-4">
                        💚
                    </div>
                    <h1 className="text-3xl font-semibold text-[#1C1917] tracking-tight">
                        Welcome back
                    </h1>
                    <p className="text-sm text-[#78716C] mt-1">
                        Log in to continue your journey
                    </p>
                </div>

                {/* Success message from signup redirect */}
                {successMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-5">
                        {successMsg}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase tracking-widest text-[#78716C]">
                            Email or Mobile
                        </label>
                        <input
                            name="identifier"
                            type="text"
                            placeholder="jane@email.com or 9876543210"
                            value={form.identifier}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-[#E8E0D8] text-sm text-[#1C1917] bg-[#FAFAF9] outline-none focus:border-orange-400 transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase tracking-widest text-[#78716C]">
                            Password
                        </label>
                        <input
                            name="password"
                            type="password"
                            placeholder="Your password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-[#E8E0D8] text-sm text-[#1C1917] bg-[#FAFAF9] outline-none focus:border-orange-400 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full py-3 rounded-full bg-gradient-to-r from-orange-400 to-purple-600 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </button>
                </form>

                <p className="text-center text-sm text-[#78716C] mt-6">
                    Don't have an account?{" "}
                    <Link
                        to="/signup"
                        className="text-orange-500 font-semibold hover:underline"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}