import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import GoalsPage from './pages/GoalsPage';
import TodayPage from './pages/TodayPage';
import PomodoroPage from './pages/PomodoroPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <i className="fa-solid fa-brain" />
      </div>
      <div className="loading-spinner"></div>
    </div>
  );
}

function AppRouter() {
  const { user } = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (!user) return <AuthPage />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="pomodoro" element={<PomodoroPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AuthProvider><AppRouter /></AuthProvider>;
}
