import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

import AppLayout from "./layouts/AppLayout";

import Dashboard from "./pages/app/Dashboard";
import LogsPage from "./pages/app/LogsPage";
import RemindersPage from "./pages/app/RemindersPage";
import AICoachPage from "./pages/app/AICoachPage";
import ReportsPage from "./pages/app/ReportsPage";
import ProfilePage from "./pages/app/ProfilePage";
import SettingsPage from "./pages/app/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/ai-coach" element={<AICoachPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;