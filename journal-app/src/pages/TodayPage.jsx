import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const QUOTES = [
  '"The beautiful thing about learning is that no one can take it away from you." — B.B. King',
  '"Live as if you were to die tomorrow. Learn as if you were to live forever." — Gandhi',
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"The more that you read, the more things you will know." — Dr. Seuss',
  '"Education is the passport to the future." — Malcolm X',
];

const EMPTY_CONTRACT = { mainFocus: '', task1: '', task2: '', task3: '' };
const todayStr = () => new Date().toISOString().split('T')[0];

export default function TodayPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Weekly Contract
  const [contract, setContract] = useState(EMPTY_CONTRACT);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractSaved, setContractSaved] = useState(false);

  const today = todayStr();
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Load tasks + contract from Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();

        // Weekly contract
        setContract(data.weeklyContract ?? EMPTY_CONTRACT);

        // Tasks
        const plan = data.todaysPlan ?? {};
        if (plan.date === today) {
          setTasks(plan.tasks ?? []);
        } else {
          // New day — archive old tasks and reset
          const history = data.dailyReportsHistory ?? [];
          if (plan.date && plan.tasks?.length > 0) {
            history.push({
              date: plan.date,
              whatLearned: `Completed ${plan.tasks.filter(t => t.done).length}/${plan.tasks.length} tasks`,
              tasks: plan.tasks,
            });
            setDoc(doc(db, 'users', user.uid), {
              todaysPlan: { date: today, tasks: [] },
              dailyReportsHistory: history,
            }, { merge: true });
          }
          setTasks([]);
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, today]);

  const saveTasksToFirestore = useCallback(async (updatedTasks) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        todaysPlan: { date: today, tasks: updatedTasks },
      }, { merge: true });
    } finally { setSaving(false); }
  }, [user, today]);

  const addTask = () => {
    if (!input.trim()) return;
    const newTask = { id: Date.now().toString(), text: input.trim(), done: false };
    const updated = [...tasks, newTask];
    setTasks(updated);
    saveTasksToFirestore(updated);
    setInput('');
  };

  const toggleTask = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    saveTasksToFirestore(updated);
  };

  const deleteTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveTasksToFirestore(updated);
  };

  const handleSaveContract = async () => {
    if (!user) return;
    setContractSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { weeklyContract: contract }, { merge: true });
      setContractSaved(true);
      setTimeout(() => setContractSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setContractSaving(false); }
  };

  const doneTasks = tasks.filter(t => t.done).length;
  const progressPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fa-solid fa-list-check" style={{ marginRight: 8 }} /> Tasks
        </h1>
        <p className="page-subtitle">{dateLabel}</p>
      </div>

      {/* Quote */}
      <div className="card card-p" style={{ marginBottom: 20, borderLeft: '3px solid var(--accent-primary)' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>{quote}</p>
      </div>

      {/* Weekly Contract */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 2 }}>
              <i className="fa-solid fa-file-signature" style={{ marginRight: 8, color: 'var(--accent-cyan)' }} />Weekly Contract
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Define your commitment for this week</p>
          </div>
          <button
            className={`btn btn-sm ${contractSaved ? 'btn-ghost' : 'btn-primary'}`}
            onClick={handleSaveContract}
            disabled={contractSaving}
          >
            {contractSaved
              ? <><i className="fa-solid fa-check" /> Saved</>
              : contractSaving ? 'Saving...' : <><i className="fa-solid fa-floppy-disk" /> Save</>}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Main focus of the week</label>
            <textarea
              className="form-textarea"
              placeholder="What is your primary learning goal this week?"
              value={contract.mainFocus}
              onChange={e => setContract(c => ({ ...c, mainFocus: e.target.value }))}
              style={{ minHeight: 72 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {['task1', 'task2', 'task3'].map((key, i) => (
              <div className="form-group" key={key}>
                <label className="form-label">Key task {i + 1}</label>
                <input
                  className="form-input"
                  placeholder={`Task ${i + 1}...`}
                  value={contract[key]}
                  onChange={e => setContract(c => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="card card-p" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Today's Progress</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {doneTasks}/{tasks.length} done ({progressPct}%)
              {saving && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>saving…</span>}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Add Task */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            placeholder="Add a task for today..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button className="btn btn-primary" onClick={addTask} disabled={!input.trim()}>
            <i className="fa-solid fa-plus" /> Add
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="card card-p">
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 }}>Today's Tasks</h2>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-star" /></div>
            <div className="empty-state-title">Clear day ahead!</div>
            <div className="empty-state-desc">Add tasks to make the most of your learning session.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map(task => (
              <div
                key={task.id}
                className={`task-item ${task.done ? 'done' : ''}`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="task-checkbox">{task.done ? <i className="fa-solid fa-check" /> : ''}</div>
                <span className="task-text">{task.text}</span>
                <button
                  className="btn btn-ghost btn-icon-only btn-sm"
                  onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                  style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.75rem' }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
