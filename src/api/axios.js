import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000",
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("vita_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// On 401 → clear token and redirect to login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("vita_token");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default api;