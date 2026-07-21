import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'fa-solid fa-house', end: true },
  { to: '/goals', label: 'Goals', icon: 'fa-solid fa-bullseye' },
  { to: '/today', label: 'Tasks', icon: 'fa-solid fa-list-check' },
  { to: '/pomodoro', label: 'Pomodoro', icon: 'fa-solid fa-clock' },
  { to: '/history', label: 'Learning Reports', icon: 'fa-solid fa-book-open' },
];

export default function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => signOut(auth);
  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="app-layout">
      <button className="mobile-toggle" onClick={() => setSidebarOpen(o => !o)}>
        <i className="fa-solid fa-bars" />
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <i className="fa-solid fa-brain" />
          </div>
          <div className="sidebar-logo-text">
            Learning Hub
            <span>your journal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon"><i className={item.icon} /></span>
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section-label" style={{ marginTop: 8 }}>Account</div>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-item-icon"><i className="fa-solid fa-gear" /></span>
            Settings
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{avatarLetter}</div>
            <div className="user-info-text">
              <div className="user-name">{user?.displayName ?? 'User'}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-full btn-sm" onClick={handleSignOut}>
            <i className="fa-solid fa-right-from-bracket" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
