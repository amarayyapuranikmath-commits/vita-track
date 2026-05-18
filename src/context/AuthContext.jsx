import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── On app boot: if token exists, fetch current user ──
    useEffect(() => {
        const token = localStorage.getItem("vita_token");
        if (!token) {
            setLoading(false);
            return;
        }
        api
            .get("/api/users/me")
            .then((res) => setUser(res.data))
            .catch(() => {
                localStorage.removeItem("vita_token");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Signup: create account (no auto-login) ──
    const signup = async ({ full_name, email, mobile, password }) => {
        const res = await api.post("/api/auth/signup", {
            full_name,
            email,
            mobile,
            password,
        });
        return res.data;
    };

    // ── Login: get token → fetch user ──
    const login = async ({ identifier, password }) => {
        const res = await api.post("/api/auth/login", { identifier, password });
        localStorage.setItem("vita_token", res.data.access_token);
        const me = await api.get("/api/users/me");
        setUser(me.data);
        return me.data;
    };

    // ── Logout ──
    const logout = () => {
        localStorage.removeItem("vita_token");
        setUser(null);
    };

    // ── Refresh user (call after profile update) ──
    const refreshUser = async () => {
        const res = await api.get("/api/users/me");
        setUser(res.data);
        return res.data;
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signup, login, logout, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);