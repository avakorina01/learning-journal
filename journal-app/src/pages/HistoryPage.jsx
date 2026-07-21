import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const EMPTY_REPORT = { whatLearned: '', mainAchievement: '', difficulties: '', tomorrowPlan: '', chunkTitle: '', chunkExplanation: '', tasks: ['', '', ''] };

const todayStr = () => new Date().toISOString().split('T')[0];

// Build last 90 days array
function buildHeatmapDays(reports) {
  const reportDates = new Set((reports ?? []).map(r => r.date));
  const days = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, hasReport: reportDates.has(dateStr) });
  }
  return days;
}

function Heatmap({ days }) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map(day => (
              <div
                key={day.date}
                title={day.date}
                style={{
                  width: 13, height: 13, borderRadius: 3,
                  background: day.hasReport ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                  transition: 'transform 0.1s',
                  cursor: 'default',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Less</span>
        {[0.06, 0.3, 0.6, 1].map((opacity, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: i === 0 ? 'rgba(255,255,255,0.06)' : `rgba(139,92,246,${opacity})` }} />
        ))}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  );
}

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}><i className="fa-solid fa-calendar-days" style={{ marginRight: 6 }} />{report.date}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {report.mainAchievement ?? report.whatLearned ?? 'Daily report'}
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><i className="fa-solid fa-chevron-down" /></span>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--glass-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.whatLearned && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>What I Learned</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.whatLearned}</p>
            </div>
          )}
          {report.mainAchievement && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Main Achievement</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.mainAchievement}</p>
            </div>
          )}
          {report.chunkTitle && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Chunk of the Day: {report.chunkTitle}</div>
              {report.chunkExplanation && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.chunkExplanation}</p>}
            </div>
          )}
          {report.tasks?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tasks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.tasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>{t.done ? <i className="fa-solid fa-check" style={{ color: 'var(--accent-primary)' }} /> : <i className="fa-regular fa-square" />}</span>
                    <span style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_REPORT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadReports = () => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
        if (snap.exists()) setReports(snap.data().dailyReportsHistory ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, [user]);

  const handleSaveReport = async () => {
    if (!form.whatLearned.trim() && !form.mainAchievement.trim()) return;
    setSaving(true);
    
    const validTasks = (form.tasks || []).filter(t => typeof t === 'string' && t.trim()).map(t => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      text: t.trim(),
      done: false
    }));

    const newReport = { ...form, date: todayStr(), tasks: validTasks };
    
    const updatedReports = [
      ...reports.filter(r => r.date !== todayStr()),
      newReport,
    ];
    
    try {
      await setDoc(doc(db, 'users', user.uid), { 
        dailyReportsHistory: updatedReports,
        todaysPlan: {
          focus: "Plan from yesterday's report",
          tasks: validTasks
        }
      }, { merge: true });
      setReports(updatedReports);
      setSaved(true);
      setShowForm(false);
      setForm(EMPTY_REPORT);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const sortedReports = [...reports].reverse();
  const heatmapDays = buildHeatmapDays(reports);
  const totalDays = reports.length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title"><i className="fa-solid fa-book-open" style={{ marginRight: 8 }} /> Learning Reports</h1>
          <p className="page-subtitle">Your learning journey, visualized</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-pen-to-square" /> Write Report
        </button>
      </div>

      {/* Write Report Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              <i className="fa-solid fa-pen-to-square" style={{ marginRight: 8 }} />Daily Report — {todayStr()}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">What did you learn today?</label>
                <textarea className="form-textarea" placeholder="Key insights, concepts, skills..." value={form.whatLearned} onChange={e => setForm(f => ({ ...f, whatLearned: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Main achievement</label>
                <textarea className="form-textarea" placeholder="What are you most proud of today?" value={form.mainAchievement} onChange={e => setForm(f => ({ ...f, mainAchievement: e.target.value }))} style={{ minHeight: 72 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Difficulties encountered</label>
                <textarea className="form-textarea" placeholder="What was challenging?" value={form.difficulties} onChange={e => setForm(f => ({ ...f, difficulties: e.target.value }))} style={{ minHeight: 72 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Chunk of the Day (Concept)</label>
                <input type="text" className="form-textarea" placeholder="One core concept you grasped today" value={form.chunkTitle || ''} onChange={e => setForm(f => ({ ...f, chunkTitle: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Explain it (to a 10-year-old)</label>
                <textarea className="form-textarea" placeholder="Use metaphors and simple words..." value={form.chunkExplanation || ''} onChange={e => setForm(f => ({ ...f, chunkExplanation: e.target.value }))} style={{ minHeight: 72 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Plan for tomorrow (Tasks)</label>
                {[0, 1, 2].map(i => (
                  <input 
                    key={i}
                    type="text" 
                    className="form-input" 
                    placeholder={`Task ${i + 1}...`} 
                    value={form.tasks?.[i] || ''} 
                    onChange={e => {
                      const newTasks = [...(form.tasks || ['', '', ''])];
                      newTasks[i] = e.target.value;
                      setForm(f => ({ ...f, tasks: newTasks }));
                    }} 
                    style={{ marginBottom: 8, width: '100%', boxSizing: 'border-box' }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveReport} disabled={saving}>
                  {saving ? 'Saving...' : <><i className="fa-solid fa-floppy-disk" /> Save Report</>}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}><i className="fa-solid fa-chart-simple" style={{ marginRight: 6 }} /> Activity — Last 90 Days</h2>
          <span className="badge badge-purple">{totalDays} days logged</span>
        </div>
        {loading ? (
          <div style={{ height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'pulse-dot 1.5s ease infinite' }} />
        ) : (
          <Heatmap days={heatmapDays} />
        )}
      </div>

      {/* Reports List */}
      <div>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)' }}>All Reports</h2>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : sortedReports.length === 0 ? (
          <div className="card card-p">
            <div className="empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-calendar-days" /></div>
              <div className="empty-state-title">No history yet</div>
              <div className="empty-state-desc">Complete daily tasks and they'll appear here as your learning history.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedReports.map((r, i) => (
              <ReportCard key={i} report={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
