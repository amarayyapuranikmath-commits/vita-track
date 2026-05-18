import api from "./axios";

// GET /api/reminders
export const fetchReminders = async () => {
    const res = await api.get("/api/reminders");
    return res.data;
};

// POST /api/reminders
export const createReminder = async (payload) => {
    const res = await api.post("/api/reminders", {
        category: payload.category,
        name: payload.name,
        date: payload.date || "",
        time: payload.time,
        repeat: payload.repeat,
        custom_days: payload.custom_days || [],
        sound: payload.sound,
        push: payload.push,
        vibration: payload.vibration,
        enabled: true,
    });
    return res.data;
};

// PATCH /api/reminders/{id}
export const updateReminder = async (id, updates) => {
    const res = await api.patch(`/api/reminders/${id}`, updates);
    return res.data;
};

// DELETE /api/reminders/{id}
export const deleteReminder = async (id) => {
    const res = await api.delete(`/api/reminders/${id}`);
    return res.data;
};