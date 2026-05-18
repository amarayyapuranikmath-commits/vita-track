import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Heart, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) return setError("Please enter your email.");
        if (!/\S+@\S+\.\S+/.test(email)) return setError("Enter a valid email address.");
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSent(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center px-4">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#FF7A00]/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-md"
            >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#E63A1E] to-[#FF7A00] rounded-xl flex items-center justify-center">
                            <Heart className="w-5 h-5 text-white" fill="white" />
                        </div>
                        <span className="text-white font-bold text-xl" style={{ fontFamily: "Playfair Display, serif" }}>VitaTrack</span>
                    </div>

                    {!sent ? (
                        <>
                            <h1 className="text-3xl font-bold text-white text-center mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                                Forgot password?
                            </h1>
                            <p className="text-white/40 text-sm text-center mb-8" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                Enter your email and we'll send you a reset link
                            </p>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-[#E63A1E]/10 border border-[#E63A1E]/30 text-[#E63A1E] text-sm rounded-xl px-4 py-3 mb-5"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-[#E63A1E]/60 transition-all"
                                        style={{ fontFamily: "DM Sans, sans-serif" }}
                                    />
                                </div>

                                <motion.button
                                    type="submit"
                                    whileTap={{ scale: 0.97 }}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-[#E63A1E] to-[#FF7A00] text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 disabled:opacity-60 transition-all"
                                    style={{ fontFamily: "DM Sans, sans-serif" }}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                                                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Sending...
                                        </span>
                                    ) : "Send Reset Link"}
                                </motion.button>
                            </form>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-[#E63A1E] to-[#FF7A00] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Playfair Display, serif" }}>Check your email</h2>
                            <p className="text-white/40 text-sm mb-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                We sent a reset link to <span className="text-white/70">{email}</span>
                            </p>
                        </motion.div>
                    )}

                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-sm mt-6 transition"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}