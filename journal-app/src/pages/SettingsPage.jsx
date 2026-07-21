import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [pomodoroDur, setPomodoroDur] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? 'U';

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      setNameMsg('Name updated! Refresh to see changes.');
    } catch (e) {
      setNameMsg('Error: ' + e.message);
    } finally {
      setSavingName(false);
      setTimeout(() => setNameMsg(''), 3000);
    }
  };

  const handleClearData = async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setClearing(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        goals: [],
        todaysPlan: { date: '', tasks: [] },
        dailyReportsHistory: [],
        streak: 0,
        pomodoroSessionsToday: 0,
        weeklyContract: null,
      }, { merge: false });
      setConfirmClear(false);
      alert('All data has been cleared.');
    } catch (e) {
      alert('Error clearing data: ' + e.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title"><i className="fa-solid fa-gear" style={{ marginRight: 8 }} /> Settings</h1>
        <p className="page-subtitle">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 20 }}><i className="fa-solid fa-user" style={{ marginRight: 8 }} /> Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700, color: 'white', flexShrink: 0,
            boxShadow: '0 8px 24px var(--accent-glow)',
          }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{user?.displayName ?? 'User'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={savingName} style={{ whiteSpace: 'nowrap' }}>
            {savingName ? 'Saving...' : 'Save Name'}
          </button>
        </div>
        {nameMsg && <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: 8 }}>{nameMsg}</p>}

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => signOut(auth)}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 6 }} /> Sign Out
          </button>
        </div>
      </div>

      {/* App Preferences */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 20 }}><i className="fa-solid fa-sliders" style={{ marginRight: 8 }} /> App Preferences</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Focus Duration (minutes)</label>
              <input className="form-input" type="number" min={1} max={60} value={pomodoroDur} onChange={e => setPomodoroDur(Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Short Break (minutes)</label>
              <input className="form-input" type="number" min={1} max={30} value={shortBreak} onChange={e => setShortBreak(Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Long Break (minutes)</label>
              <input className="form-input" type="number" min={1} max={60} value={longBreak} onChange={e => setLongBreak(Number(e.target.value))} />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} /> Timer preference changes take effect on next Pomodoro session start. (Placeholder — full persistence coming soon.)
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card card-p" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--accent-red)' }}><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} /> Danger Zone</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Permanently delete all your journal data including goals, tasks, history, and settings. This action cannot be undone.
        </p>
        {confirmClear && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12, fontSize: '0.85rem', color: 'var(--accent-red)' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} /> Are you sure? Click the button again to confirm. This will permanently erase all your data.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-danger btn-sm" onClick={handleClearData} disabled={clearing}>
            {clearing ? 'Clearing...' : confirmClear ? <><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} /> Confirm Clear All Data</> : <><i className="fa-solid fa-trash" style={{ marginRight: 6 }} /> Clear All Data</>}
          </button>
          {confirmClear && (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
