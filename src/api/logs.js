import api from "./axios";

// Fetch logs
export const fetchLogs = async () => {
    const res = await api.get("/api/logs");
    return res.data;
};

// Create log
export const createLog = async (type, value, note = "") => {
    const res = await api.post("/api/logs", {
        type,
        value,
        note,
    });

    return res.data;
};

// Delete log
export const deleteLog = async (id) => {
    const res = await api.delete(`/api/logs/${id}`);
    return res.data;
};