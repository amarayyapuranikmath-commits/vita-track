import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SignupPage() {
    const { signup } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        mobile: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Basic frontend validation
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            await signup(form);
            // On success → go to login with a success message
            navigate("/login", {
                state: { message: "Account created! Please log in." },
            });
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail.map((d) => d.msg).join(", "));
            } else {
                setError(detail || "Signup failed. Please try again.");
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
                        Create account
                    </h1>
                    <p className="text-sm text-[#78716C] mt-1">
                        Start your wellness journey today
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {[
                        { name: "full_name", label: "Full Name", type: "text", placeholder: "Jane Doe" },
                        { name: "email", label: "Email Address", type: "email", placeholder: "jane@email.com" },
                        { name: "mobile", label: "Mobile Number", type: "tel", placeholder: "+91 9876543210" },
                        { name: "password", label: "Password", type: "password", placeholder: "Min. 8 characters" },
                    ].map((f) => (
                        <div key={f.name} className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase tracking-widest text-[#78716C]">
                                {f.label}
                            </label>
                            <input
                                name={f.name}
                                type={f.type}
                                placeholder={f.placeholder}
                                value={form[f.name]}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-[#E8E0D8] text-sm text-[#1C1917] bg-[#FAFAF9] outline-none focus:border-orange-400 transition-colors"
                            />
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full py-3 rounded-full bg-gradient-to-r from-orange-400 to-purple-600 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center text-sm text-[#78716C] mt-6">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="text-orange-500 font-semibold hover:underline"
                    >
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}