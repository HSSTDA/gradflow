'use client';

import { useState } from 'react';
import clsx from 'clsx';
import PreviewModal, { FILE_ICON, type ModalFile } from '@/components/ui/PreviewModal';
import { useMeetingsStore } from '@/store/meetingsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useFilesStore } from '@/store/filesStore';
import { useImportantStore, type PinnedItem } from '@/store/importantStore';
import { useAuthStore } from '@/store/authStore';
import { useMilestonesStore, type Milestone } from '@/store/milestonesStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

const STATUS_LABEL: Record<string, string> = {
  UPCOMING:    'Upcoming',
  IN_PROGRESS: 'In Progress',
  COMPLETED:   'Done',
  DELAYED:     'Delayed',
}

const STATUS_CLS: Record<string, string> = {
  UPCOMING:    'bg-[var(--blue-light)]   text-[var(--blue)]',
  IN_PROGRESS: 'bg-[var(--amber-light)]  text-[var(--amber)]',
  COMPLETED:   'bg-[var(--green-light)]  text-[var(--green)]',
  DELAYED:     'bg-[var(--red-light)]    text-[var(--red)]',
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, urgent: true }
  if (diff === 0) return { label: 'Today',                     urgent: true }
  if (diff <= 7)  return { label: `${diff}d left`,             urgent: true }
  return { label: `${diff}d left`, urgent: false }
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: '＋', label: 'Add Task',    page: 'tasks' },
  { icon: '💬', label: 'Open Chat',   page: 'chat'  },
  { icon: '↑',  label: 'Upload File', page: 'files' },
];


type CardData = { borderColor: string; tag: string; tagCls: string; title: string; body: string; by: string };

const CATEGORY_TO_CARD: Record<string, { borderColor: string; tagCls: string }> = {
  CRITICAL:     { borderColor: 'var(--red)',    tagCls: 'bg-[var(--red-light)]    text-[var(--red)]'    },
  INSTRUCTIONS: { borderColor: 'var(--blue)',   tagCls: 'bg-[var(--blue-light)]   text-[var(--blue)]'   },
  RESOURCES:    { borderColor: 'var(--green)',  tagCls: 'bg-[var(--green-light)]  text-[var(--green)]'  },
  DECISION:     { borderColor: 'var(--amber)',  tagCls: 'bg-[var(--amber-light)]  text-[var(--amber)]'  },
  ANNOUNCEMENT: { borderColor: 'var(--accent)', tagCls: 'bg-[var(--accent-light)] text-[var(--accent)]' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMeetingDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

const avatarColor = (name: string) => {
  const colors = ['#D4500A', '#2563EB', '#16A34A', '#7C3AED', '#D97706']
  return colors[(name?.charCodeAt(0) || 0) % colors.length]
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const PRIORITY_CLS: Record<Priority, string> = {
  HIGH:   'bg-[var(--red-light)]   text-[var(--red)]',
  MEDIUM: 'bg-[var(--amber-light)] text-[var(--amber)]',
  LOW:    'bg-[var(--border)]      text-[var(--text-muted)]',
};

// ─── Primitives ───────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      'bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm',
      className,
    )}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

function PinnedCard({ card }: { card: CardData }) {
  const shadowBase  = `inset 4px 0 0 ${card.borderColor}, var(--shadow-sm)`;
  const shadowHover = `inset 4px 0 0 ${card.borderColor}, var(--shadow-md)`;

  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl py-[18px] px-5 cursor-pointer"
      style={{ boxShadow: shadowBase, transition: `box-shadow var(--transition)` }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = shadowHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = shadowBase;  }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[14px] font-bold text-[var(--text-primary)] leading-snug flex-1">
          {card.title}
        </span>
        <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold', card.tagCls)}>
          {card.tag}
        </span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-[1.6] mt-2">{card.body}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-3">📌 {card.by}</p>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      {message}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedFile,       setSelectedFile]       = useState<ModalFile | null>(null);
  const [showAddMilestone,   setShowAddMilestone]   = useState(false);
  const [milestoneTitle,     setMilestoneTitle]     = useState('');
  const [milestoneDesc,      setMilestoneDesc]      = useState('');
  const [milestoneDueDate,   setMilestoneDueDate]   = useState('');
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);

  const { meetings }         = useMeetingsStore();
  const { tasks }            = useTasksStore();
  const { files }            = useFilesStore();
  const { items }            = useImportantStore();
  const { user, currentWorkspace } = useAuthStore();
  const { milestones, addMilestone, deleteMilestone } = useMilestonesStore();
  const pinnedItems          = items.filter(i => i.pinned).slice(0, 4);

  const upcoming = milestones
    .filter(m => m.status !== 'COMPLETED')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  async function handleAddMilestone() {
    if (!milestoneTitle.trim() || !milestoneDueDate || !currentWorkspace) return;
    setMilestoneSubmitting(true);
    await addMilestone(currentWorkspace.id, {
      title:       milestoneTitle.trim(),
      description: milestoneDesc.trim() || undefined,
      dueDate:     milestoneDueDate,
    });
    setMilestoneTitle('');
    setMilestoneDesc('');
    setMilestoneDueDate('');
    setMilestoneSubmitting(false);
    setShowAddMilestone(false);
  }

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSubtasks = tasks.flatMap(t =>
    t.subtasks.map((s: any) => ({ ...s, parentTitle: t.title, priority: t.priority }))
  ).filter((s: any) => !s.done).slice(0, 4);

  return (
    <div className="max-w-[1080px] mx-auto px-10 pt-10 pb-20">

      {/* Page header */}
      <div className="mb-7">
        <h1
          className="text-[28px] tracking-[-0.5px] text-[var(--text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {currentWorkspace?.name ?? 'Your Workspace'}
        </p>
      </div>

      {/* Quick Actions row */}
      <div className="flex gap-3 mt-6 mb-5">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => onNavigate?.(a.page)}
            className="flex items-center gap-2 border border-[var(--border)] rounded-lg py-[9px] px-[18px] text-[13px] font-semibold text-[var(--text-secondary)] bg-[var(--surface)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] cursor-pointer [transition:var(--transition)]"
          >
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>

        {/* Top-left — Schedule */}
        <Card className="min-h-[280px]">
          <CardHeader
            title="Schedule"
            action={
              <button
                onClick={() => onNavigate?.('meetings')}
                className="text-[12px] font-semibold text-[var(--accent)] bg-transparent border-none cursor-pointer p-0"
              >
                View All →
              </button>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meetings.length === 0 && <EmptyState message="No meetings yet" />}
            {meetings.slice(0, 4).map(meeting => (
              <div
                key={meeting.id}
                onClick={() => onNavigate?.('meetings')}
                style={{
                  background:   'var(--bg)',
                  border:       '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding:      '12px 14px',
                  borderLeft:   `3px solid ${meeting.typeColor}`,
                  cursor:       'pointer',
                  transition:   'var(--transition)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {meeting.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  📅 {formatMeetingDate(meeting.date)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  📍 Online
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top-right — Upcoming Deadlines */}
        <Card className="min-h-[280px]">
          <CardHeader
            title="Upcoming Deadlines"
            action={
              <button
                onClick={() => setShowAddMilestone(true)}
                className="text-[12px] font-semibold text-[var(--accent)] bg-transparent border-none cursor-pointer p-0"
              >
                + Add
              </button>
            }
          />
          <div className="flex flex-col gap-2">
            {upcoming.length === 0 && <EmptyState message="No upcoming deadlines" />}
            {upcoming.map(m => {
              const { label: dLabel, urgent } = daysUntil(m.dueDate);
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-2.5 py-2 border-b border-[var(--border)] last:border-b-0 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                        {m.title}
                      </span>
                      <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_CLS[m.status])}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className={clsx('text-[11px] font-semibold', urgent ? 'text-[var(--red)]' : 'text-[var(--text-muted)]')}>
                        · {dLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => currentWorkspace && deleteMilestone(currentWorkspace.id, m.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)] text-[14px] bg-transparent border-none cursor-pointer p-0 leading-none transition-opacity duration-150"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Bottom-left — Current Tasks */}
        <Card className="min-h-[280px]">
          <CardHeader
            title="Current Tasks"
            action={
              <button onClick={() => onNavigate?.('tasks')} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-150">
                View All →
              </button>
            }
          />
          <div className="flex flex-col gap-3">
            {allSubtasks.length === 0 && <EmptyState message="No tasks yet" />}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {allSubtasks.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2.5">
                <div className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[var(--border-strong)]" />
                <span className="flex-1 min-w-0 text-[13.5px] font-medium text-[var(--text-primary)] truncate">
                  {s.title}
                </span>
                {s.dueDate && (
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                    Due {new Date(s.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className={clsx(
                  'shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize',
                  PRIORITY_CLS[s.priority as Priority],
                )}>
                  {s.priority.toLowerCase()}
                </span>
                <div
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: avatarColor(s.assignee?.name ?? ''), color: 'white' }}
                >
                  {getInitials(s.assignee?.name ?? '')}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bottom-right — Recent Files */}
        <Card className="min-h-[280px]">
          <CardHeader
            title="Recent Files"
            action={
              <button className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-150">
                View All →
              </button>
            }
          />
          <div>
            {files.length === 0 && <EmptyState message="No files yet" />}
            {files.slice(0, 6).map((file) => {
              const icon = FILE_ICON[file.type as 'pdf' | 'docx' | 'pptx'] ?? { bg: '#F3F4F6', emoji: '📎' };
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile({ name: file.name, size: file.size, date: file.date ?? '', type: file.type as 'pdf' | 'docx' | 'pptx' })}
                  className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)] hover:px-2 hover:rounded-[6px] cursor-pointer transition-all duration-150"
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[18px]"
                    style={{ background: icon.bg }}
                  >
                    {icon.emoji}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {file.size} · {file.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>

      {/* Important section */}
      <div className="mt-8">
        <div className="mb-4">
          <h2
            className="text-[20px] text-[var(--text-primary)] leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Important
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            Pinned notes, supervisor instructions &amp; key decisions
          </p>
        </div>
        <div className="grid grid-cols-2 gap-[14px]">
          {pinnedItems.length === 0 && (
            <div className="col-span-2">
              <EmptyState message="No pinned items yet" />
            </div>
          )}
          {pinnedItems.map(item => {
            const s = CATEGORY_TO_CARD[item.category] ?? CATEGORY_TO_CARD.INSTRUCTIONS;
            return (
              <PinnedCard
                key={item.id}
                card={{
                  borderColor: s.borderColor,
                  tagCls:      s.tagCls,
                  tag:         item.category,
                  title:       item.title,
                  body:        item.body,
                  by:          `${item.addedBy?.name ?? 'Unknown'} · ${item.date}`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* File preview modal */}
      <PreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />

      {/* Add Milestone modal */}
      {showAddMilestone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddMilestone(false); }}
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 w-full max-w-[420px] shadow-[var(--shadow-lg)]"
            style={{ boxSizing: 'border-box' }}
          >
            <h3 className="text-[17px] font-bold text-[var(--text-primary)] mb-4">
              Add Deadline
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Title *
                </label>
                <input
                  autoFocus
                  value={milestoneTitle}
                  onChange={e => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Submit final report"
                  className="w-full border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                  style={{ transition: 'var(--transition)' }}
                  onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Description
                </label>
                <input
                  value={milestoneDesc}
                  onChange={e => setMilestoneDesc(e.target.value)}
                  placeholder="Optional details"
                  className="w-full border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                  style={{ transition: 'var(--transition)' }}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={milestoneDueDate}
                  onChange={e => setMilestoneDueDate(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                  style={{ transition: 'var(--transition)' }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAddMilestone(false)}
                className="flex-1 border border-[var(--border)] rounded-[var(--radius-sm)] py-2 text-[13px] font-semibold text-[var(--text-secondary)] bg-transparent cursor-pointer hover:bg-[var(--bg)]"
                style={{ transition: 'var(--transition)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMilestone}
                disabled={!milestoneTitle.trim() || !milestoneDueDate || milestoneSubmitting}
                className="flex-1 rounded-[var(--radius-sm)] py-2 text-[13px] font-semibold text-white border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', transition: 'var(--transition)' }}
              >
                {milestoneSubmitting ? 'Adding…' : 'Add Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
