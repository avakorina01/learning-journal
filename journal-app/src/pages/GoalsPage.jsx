import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const EMPTY_FORM = { title: '', why: '', how: '', deadline: '', status: 'active' };

function GoalCard({ goal, onEdit, onDelete, onProgressChange }) {
  const badgeClass = goal.status === 'active' ? 'badge-purple' : goal.status === 'completed' ? 'badge-green' : 'badge-orange';
  const badgeLabel = goal.status === 'active' ? 'Active' : goal.status === 'completed' ? 'Completed' : 'Paused';
  const badgeIcon = goal.status === 'active' ? 'fa-solid fa-circle-dot' : goal.status === 'completed' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-pause';

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, flex: 1 }}>{goal.title}</h3>
        <span className={`badge ${badgeClass}`}><i className={badgeIcon} style={{marginRight:4}}/>{badgeLabel}</span>
      </div>

      {goal.why && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Why: </span>{goal.why}
        </p>
      )}

      {goal.deadline && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-calendar" style={{marginRight: 5}}/> Deadline: {goal.deadline}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{goal.progress ?? 0}%</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 6 }}>
          <div className="progress-fill" style={{ width: `${goal.progress ?? 0}%` }} />
        </div>
        <input
          type="range" min={0} max={100} value={goal.progress ?? 0}
          onChange={e => onProgressChange(goal.id, Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)} style={{ flex: 1 }}>
          <i className="fa-solid fa-pen-to-square" /> Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(goal.id)} style={{ flex: 1 }}>
          <i className="fa-solid fa-trash" /> Delete
        </button>
      </div>
    </div>
  );
}


export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
        if (snap.exists()) {
          setGoals(snap.data().goals ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);


  const saveToFirestore = async (updatedGoals) => {
    await setDoc(doc(db, 'users', user.uid), { goals: updatedGoals }, { merge: true });
  };

  const handleSave = async () => {
    if (!form?.title?.trim()) {
      alert("Please enter a Goal Title.");
      return;
    }
    setSaving(true);
    let updatedGoals;
    if (editingId) {
      updatedGoals = goals.map(g => g.id === editingId ? { ...g, ...form } : g);
    } else {
      const newGoal = { ...form, id: Date.now().toString(), progress: 0, createdAt: new Date().toISOString() };
      updatedGoals = [...goals, newGoal];
    }
    try {
      await saveToFirestore(updatedGoals);
      setGoals(updatedGoals);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (e) {
      console.error(e);
      alert("Failed to save goal: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (goal) => {
    setEditingId(goal.id);
    setForm({ title: goal.title, why: goal.why ?? '', how: goal.how ?? '', deadline: goal.deadline ?? '', status: goal.status });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    const updatedGoals = goals.filter(g => g.id !== id);
    await saveToFirestore(updatedGoals);
    setGoals(updatedGoals);
  };

  const handleProgressChange = async (id, value) => {
    const updatedGoals = goals.map(g => g.id === id ? { ...g, progress: value } : g);
    setGoals(updatedGoals);
    await saveToFirestore(updatedGoals);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };


  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title"><i className="fa-solid fa-bullseye" style={{marginRight: 10, color: 'var(--accent-primary)'}}/>Goals</h1>
          <p className="page-subtitle">Set, track, and achieve your learning goals</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
          <i className="fa-solid fa-plus" /> New Goal
        </button>
      </div>



      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-box lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingId ? 'Edit Goal' : <><i className="fa-solid fa-mountain" style={{marginRight:8}}/> New Goal</>}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Goal Title *</label>
                <input className="form-input" placeholder="e.g. Master React in 3 months" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Why is this important?</label>
                <textarea className="form-textarea" placeholder="Explain your motivation..." value={form.why} onChange={e => setForm(f => ({ ...f, why: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">How will you achieve it?</label>
                <textarea className="form-textarea" placeholder="Your action plan..." value={form.how} onChange={e => setForm(f => ({ ...f, how: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Deadline</label>
                  <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Goal' : 'Create Goal'}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="card card-p" style={{ textAlign: 'center' }}>
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-mountain" /></div>
            <div className="empty-state-title">No goals yet</div>
            <div className="empty-state-desc">What do you want to learn? Start by setting your first goal.</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <i className="fa-solid fa-plus" /> Create First Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onProgressChange={handleProgressChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
