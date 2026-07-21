import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';

function Skeleton({ height = 20, width = '100%', style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: 8,
      background: 'rgba(255,255,255,0.06)',
      animation: 'pulse-dot 1.5s ease infinite',
      ...style
    }} />
  );
}

function StatCard({ icon, label, value, color, loading }) {
  return (
    <div className="card stat-card">
      <div style={{ fontSize: '1.25rem', color }}><i className={icon} /></div>
      <div className="stat-label">{label}</div>
      {loading
        ? <Skeleton height={36} width={60} />
        : <div className="stat-value" style={{ color }}>{value}</div>}
    </div>
  );
}

function EmptyState({ icon, title, desc, ctaLabel, ctaTo }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><i className={icon} /></div>
      <div className="empty-state-title">{title}</div>
      {desc && <div className="empty-state-desc">{desc}</div>}
      {ctaLabel && <Link to={ctaTo} className="btn btn-primary btn-sm">{ctaLabel}</Link>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => setData(snap.exists() ? snap.data() : {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const activeGoal = data?.goals?.find(g => g.status === 'active');
  const todayTasks = data?.todaysPlan?.tasks?.slice(0, 3) ?? [];
  const doneTasks = data?.todaysPlan?.tasks?.filter(t => t.done).length ?? 0;
  const totalTasks = data?.todaysPlan?.tasks?.length ?? 0;
  const streak = data?.streak ?? 0;
  const activeGoals = data?.goals?.filter(g => g.status === 'active').length ?? 0;
  const pomosToday = data?.pomodoroSessionsToday ?? 0;
  const reports = data?.dailyReportsHistory?.slice(-3).reverse() ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{greeting}, {firstName}</h1>
        <p className="page-subtitle">{dateStr}</p>
      </div>

      {/* Stat Row */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon="fa-solid fa-fire" label="Day Streak" value={streak} color="var(--accent-orange)" loading={loading} />
        <StatCard icon="fa-solid fa-bullseye" label="Active Goals" value={activeGoals} color="var(--accent-primary)" loading={loading} />
        <StatCard icon="fa-solid fa-clock" label="Pomodoros Today" value={pomosToday} color="var(--accent-cyan)" loading={loading} />
        <StatCard icon="fa-solid fa-check-double" label="Tasks Done" value={`${doneTasks}/${totalTasks}`} color="var(--accent-green)" loading={loading} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* Active Goal */}
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              <i className="fa-solid fa-bullseye" style={{ marginRight: 8, color: 'var(--accent-primary)' }} />Active Goal
            </h2>
            <Link to="/goals" className="btn btn-ghost btn-sm">Manage</Link>
          </div>
          {loading
            ? <><Skeleton height={18} style={{ marginBottom: 8 }} /><Skeleton height={14} width="60%" style={{ marginBottom: 16 }} /><Skeleton height={6} /></>
            : activeGoal
              ? (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{activeGoal.title}</div>
                  {activeGoal.deadline && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                      <i className="fa-solid fa-calendar" style={{ marginRight: 5 }} />Deadline: {activeGoal.deadline}
                    </div>
                  )}
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${activeGoal.progress ?? 0}%` }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>{activeGoal.progress ?? 0}% complete</div>
                </>
              )
              : <EmptyState icon="fa-solid fa-bullseye" title="No active goal yet" desc="Set a learning goal to start tracking your progress." ctaLabel="Create Goal" ctaTo="/goals" />}
        </div>

        {/* Today's Plan */}
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              <i className="fa-solid fa-list-check" style={{ marginRight: 8, color: 'var(--accent-green)' }} />Today's Focus
            </h2>
            <Link to="/today" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {loading
            ? <><Skeleton height={44} style={{ marginBottom: 8 }} /><Skeleton height={44} style={{ marginBottom: 8 }} /><Skeleton height={44} /></>
            : todayTasks.length > 0
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {todayTasks.map(task => (
                    <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                      <div className="task-checkbox">
                        {task.done && <i className="fa-solid fa-check" style={{ fontSize: '0.65rem' }} />}
                      </div>
                      <span className="task-text">{task.text}</span>
                    </div>
                  ))}
                </div>
              )
              : <EmptyState icon="fa-solid fa-list-check" title="No tasks for today" desc="Add tasks to plan your learning session." ctaLabel="Plan Today" ctaTo="/today" />}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-2">
        {/* Weekly Contract */}
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              <i className="fa-solid fa-file-signature" style={{ marginRight: 8, color: 'var(--accent-cyan)' }} />Weekly Contract
            </h2>
            <Link to="/goals" className="btn btn-ghost btn-sm">Edit</Link>
          </div>
          {loading
            ? <Skeleton height={80} />
            : data?.weeklyContract?.mainFocus
              ? <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.weeklyContract.mainFocus}</p>
              : <EmptyState icon="fa-solid fa-file-signature" title="No weekly contract" desc="Define your focus for the week." ctaLabel="Set Focus" ctaTo="/today" />}
        </div>

        {/* Recent Activity */}
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              <i className="fa-solid fa-calendar-days" style={{ marginRight: 8, color: 'var(--accent-orange)' }} />Recent Reports
            </h2>
            <Link to="/history" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {loading
            ? <><Skeleton height={40} style={{ marginBottom: 8 }} /><Skeleton height={40} style={{ marginBottom: 8 }} /><Skeleton height={40} /></>
            : reports.length > 0
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reports.map((r, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>{r.date}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.mainAchievement ?? r.whatLearned ?? 'Daily report'}</div>
                    </div>
                  ))}
                </div>
              )
              : <EmptyState icon="fa-solid fa-calendar-days" title="No reports yet" desc="Complete your first daily report to see your history." ctaLabel="Write Report" ctaTo="/history" />}
        </div>
      </div>
    </div>
  );
}
