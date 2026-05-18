import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    // Wait for token check to finish before deciding
    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "DM Sans, sans-serif",
                    color: "#78716C",
                    fontSize: 15,
                }}
            >
                Loading...
            </div>
        );
    }

    return user ? children : <Navigate to="/login" replace />;
}