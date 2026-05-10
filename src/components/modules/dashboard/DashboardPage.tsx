'use client';

import { useState } from 'react';
import clsx from 'clsx';
import PreviewModal, { FILE_ICON, type ModalFile } from '@/components/ui/PreviewModal';
import { useMeetingsStore } from '@/store/meetingsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useFilesStore } from '@/store/filesStore';
import { useImportantStore, type PinnedItem } from '@/store/importantStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

// ─── Data ─────────────────────────────────────────────────────────────────────
const TASK_MEMBERS: Record<string, string> = {
  OK: '#2563EB',
  AN: '#7C3AED',
  NS: '#D97706',
  SA: '#D4500A',
  LH: '#16A34A',
};

const DEADLINES: { color: string; day: string; month: string; name: string; sub: string }[] = [
  { color: 'var(--accent)', day: '10', month: 'MAY', name: 'UI Prototype Review', sub: 'Milestone'         },
  { color: 'var(--amber)',  day: '12', month: 'MAY', name: 'Chapter 3 Draft',     sub: 'Research · Ahmed'  },
  { color: 'var(--blue)',   day: '25', month: 'MAY', name: 'Mid-Project Report',  sub: 'All members'       },
  { color: 'var(--red)',    day: '20', month: 'JUN', name: 'Final Submission',    sub: '🎯 Main deadline'  },
];

const QUICK_ACTIONS = [
  { icon: '＋', label: 'Add Task'    },
  { icon: '💬', label: 'Open Chat'   },
  { icon: '↑',  label: 'Upload File' },
];


type CardData = { borderColor: string; tag: string; tagCls: string; title: string; body: string; by: string };

const TYPE_TO_CARD: Record<PinnedItem['type'], { borderColor: string; tagCls: string }> = {
  red:   { borderColor: 'var(--red)',   tagCls: 'bg-[var(--red-light)]   text-[var(--red)]'   },
  blue:  { borderColor: 'var(--blue)',  tagCls: 'bg-[var(--blue-light)]  text-[var(--blue)]'  },
  green: { borderColor: 'var(--green)', tagCls: 'bg-[var(--green-light)] text-[var(--green)]' },
  amber: { borderColor: 'var(--amber)', tagCls: 'bg-[var(--amber-light)] text-[var(--amber)]' },
};

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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<ModalFile | null>(null);
  const { meetings } = useMeetingsStore();
  const { tasks }    = useTasksStore();
  const { files }    = useFilesStore();
  const { items }    = useImportantStore();
  const pinnedItems  = items.filter(i => i.pinned).slice(0, 4);

  const activeTasks = [
    ...tasks.filter(p => p.status === 'IN_PROGRESS'),
    ...tasks.filter(p => p.status === 'TODO'),
  ].flatMap(p => p.subtasks.filter(s => !s.done).map(s => ({ subtask: s, parent: p })))
   .slice(0, 4);

  return (
    <div className="max-w-[1080px] mx-auto px-10 pt-10 pb-20">

      {/* Page header */}
      <div className="mb-7">
        <h1
          className="text-[28px] tracking-[-0.5px] text-[var(--text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Good morning, Sara 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          AI-Based Graduation System&nbsp;&nbsp;·&nbsp;&nbsp;CS 2025&nbsp;&nbsp;·&nbsp;&nbsp;Dr. Khalid Al-Rashidi
        </p>
      </div>

      {/* Quick Actions row */}
      <div className="flex gap-3 mt-6 mb-5">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
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
                  📅 {meeting.date} &nbsp;·&nbsp; {meeting.time}
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
          <CardHeader title="Upcoming Deadlines" />
          <div className="flex flex-col gap-3.5">
            {DEADLINES.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <div
                  className="shrink-0"
                  style={{ width: 5, height: 36, background: d.color, borderRadius: 3 }}
                />
                <div className="shrink-0 w-[44px]">
                  <div className="text-[18px] font-bold text-[var(--text-primary)] leading-none">{d.day}</div>
                  <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{d.month}</div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{d.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{d.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bottom-left — Current Tasks */}
        <Card className="min-h-[280px]">
          <CardHeader
            title="Current Tasks"
            action={
              <button className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-150">
                View All →
              </button>
            }
          />
          <div className="flex flex-col gap-3">
            {activeTasks.map(({ subtask, parent }) => (
              <div key={subtask.id} className="flex items-center gap-2.5">
                <div className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[var(--border-strong)]" />
                <span className="flex-1 min-w-0 text-[13.5px] font-medium text-[var(--text-primary)] truncate">
                  {subtask.title}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--text-muted)]">Due {subtask.dueDate}</span>
                <span className={clsx(
                  'shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize',
                  PRIORITY_CLS[parent.priority],
                )}>
                  {parent.priority}
                </span>
                <div
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: TASK_MEMBERS[subtask.assigneeId ?? ''] ?? '#888' }}
                >
                  {subtask.assigneeId}
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
          {pinnedItems.map(item => {
            const s = TYPE_TO_CARD[item.type];
            return (
              <PinnedCard
                key={item.id}
                card={{
                  borderColor: s.borderColor,
                  tagCls:      s.tagCls,
                  tag:         item.category,
                  title:       item.title,
                  body:        item.body,
                  by:          `${item.by} · ${item.date}`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* File preview modal */}
      <PreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />

    </div>
  );
}
