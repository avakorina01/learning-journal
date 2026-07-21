import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const MODES = [
  { key: 'focus', label: 'Focus', duration: 25 * 60, color: 'var(--accent-primary)' },
  { key: 'short', label: 'Short Break', duration: 5 * 60, color: 'var(--accent-green)' },
  { key: 'long', label: 'Long Break', duration: 15 * 60, color: 'var(--accent-cyan)' },
];

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Web Audio API helpers
function createAudioCtx() {
  return new (window.AudioContext || window.webkitAudioContext)();
}

function playBell(audioCtx) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 1.5);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
  osc.start();
  osc.stop(audioCtx.currentTime + 2);
}

function createRainNoise(audioCtx) {
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.5;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.08;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  return source;
}

function createForestNoise(audioCtx) {
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.05;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  return source;
}

function createFocusNoise(audioCtx) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 40;
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  return osc;
}

const AMBIENT_OPTIONS = [
  { key: 'none', label: 'None', icon: <i className="fa-solid fa-volume-xmark" /> },
  { key: 'rain', label: 'Rain', icon: <i className="fa-solid fa-cloud-rain" /> },
  { key: 'forest', label: 'Forest', icon: <i className="fa-solid fa-tree" /> },
  { key: 'focus', label: 'Focus', icon: <i className="fa-solid fa-music" /> },
];

export default function PomodoroPage() {
  const { user } = useAuth();
  const [modeIdx, setModeIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [ambient, setAmbient] = useState('none');
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const ambientNodeRef = useRef(null);

  const mode = MODES[modeIdx];
  const totalDuration = mode.duration;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const conicGradient = `conic-gradient(${mode.color} ${progress}%, rgba(255,255,255,0.05) ${progress}%)`;

  // Load tasks from Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        setSessions(snap.data().pomodoroSessionsToday ?? 0);
        setTasks(snap.data().todaysPlan?.tasks ?? []);
      }
    }).catch(() => {});
  }, [user]);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const stopAmbient = useCallback(() => {
    if (ambientNodeRef.current) {
      try { ambientNodeRef.current.stop(); } catch (e) { /* ignore */ }
      ambientNodeRef.current = null;
    }
  }, []);

  const startAmbient = useCallback((key) => {
    stopAmbient();
    if (key === 'none') return;
    const ctx = getAudioCtx();
    if (key === 'rain') ambientNodeRef.current = createRainNoise(ctx);
    else if (key === 'forest') ambientNodeRef.current = createForestNoise(ctx);
    else if (key === 'focus') ambientNodeRef.current = createFocusNoise(ctx);
  }, [stopAmbient]);

  const handleAmbient = (key) => {
    setAmbient(key);
    if (key === 'none') stopAmbient();
    else startAmbient(key);
  };

  const handleSessionComplete = useCallback(async () => {
    const ctx = getAudioCtx();
    playBell(ctx);
    const newSessions = sessions + 1;
    setSessions(newSessions);
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { pomodoroSessionsToday: newSessions }, { merge: true });
    }
    // Auto switch to break
    const nextIdx = newSessions % 4 === 0 ? 2 : 1;
    setModeIdx(nextIdx);
    setTimeLeft(MODES[nextIdx].duration);
    setRunning(false);
  }, [sessions, user]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            handleSessionComplete();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, handleSessionComplete]);

  const switchMode = (idx) => {
    setRunning(false);
    setModeIdx(idx);
    setTimeLeft(MODES[idx].duration);
  };

  const reset = () => {
    setRunning(false);
    setTimeLeft(mode.duration);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title"><i className="fa-solid fa-clock" style={{ marginRight: 8 }} /> Pomodoro Timer</h1>
        <p className="page-subtitle">Focus, break, repeat. Build momentum.</p>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Timer Card */}
        <div className="card card-p" style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {/* Mode Tabs */}
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: '100%' }}>
            {MODES.map((m, i) => (
              <button
                key={m.key}
                onClick={() => switchMode(i)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                  background: modeIdx === i ? mode.color : 'transparent',
                  color: modeIdx === i ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Circular Timer */}
          <div style={{
            width: 220, height: 220, borderRadius: '50%',
            background: conicGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 60px ${mode.color}33, inset 0 0 0 12px var(--bg-elevated)`,
            position: 'relative',
          }}>
            <div style={{
              width: 190, height: 190, borderRadius: '50%',
              background: 'var(--bg-elevated)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.04em', color: mode.color }}>
                {formatTime(timeLeft)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{mode.label}</div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={reset}><i className="fa-solid fa-rotate-left" style={{ marginRight: 6 }} /> Reset</button>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setRunning(r => !r)}
              style={{ minWidth: 120 }}
            >
              {running ? <><i className="fa-solid fa-pause" style={{ marginRight: 6 }} /> Pause</> : <><i className="fa-solid fa-play" style={{ marginRight: 6 }} /> Start</>}
            </button>
          </div>

          {/* Session counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sessions today:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: Math.max(4, sessions) }).map((_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < sessions ? mode.color : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: mode.color }}>{sessions}</span>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task Selector */}
          <div className="card card-p">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}><i className="fa-solid fa-crosshairs" style={{ marginRight: 6 }} /> Focus On</h3>
            <select
              className="form-select"
              value={selectedTask}
              onChange={e => setSelectedTask(e.target.value)}
            >
              <option value="">— Select a task —</option>
              {tasks.filter(t => !t.done).map(t => (
                <option key={t.id} value={t.id}>{t.text}</option>
              ))}
            </select>
            {selectedTask && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: `${mode.color}18`, border: `1px solid ${mode.color}33`, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {tasks.find(t => t.id === selectedTask)?.text}
              </div>
            )}
          </div>

          {/* Ambient Sounds */}
          <div className="card card-p">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}><i className="fa-solid fa-music" style={{ marginRight: 6 }} /> Ambient Sound</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {AMBIENT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleAmbient(opt.key)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600,
                    background: ambient === opt.key ? `${mode.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${ambient === opt.key ? mode.color : 'var(--glass-border)'}`,
                    color: ambient === opt.key ? mode.color : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="card card-p" style={{ borderLeft: `3px solid ${mode.color}` }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pomodoro Technique</h3>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Focus for 25 minutes</li>
              <li>Take a 5-minute short break</li>
              <li>After 4 sessions, take a long break</li>
              <li>Repeat to build deep focus</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
