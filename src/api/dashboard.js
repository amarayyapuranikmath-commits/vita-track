// src/api/dashboard.js
import api from "./axios";

/**
 * Fetches all dashboard data in a single call.
 * Returns the full object from GET /api/dashboard.
 */
export const fetchDashboard = async () => {
    const res = await api.get("/api/dashboard");
    return res.data;
};