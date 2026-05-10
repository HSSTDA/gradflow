'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import Toast from '@/components/ui/Toast';
import { useTasksStore } from '@/store/tasksStore';
import { useAuthStore } from '@/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority   = 'HIGH' | 'MEDIUM' | 'LOW';
type Status     = 'TODO' | 'IN_PROGRESS' | 'DONE';
type Filter     = 'all' | 'mine' | 'high';
type ViewMode   = 'kanban' | 'list' | 'calendar';
type DateFilter = 'all' | 'week' | 'month' | 'overdue';

interface SubTask {
  id: string;
  title: string;
  assigneeId: string | null;
  dueDate: string | null;
  note: string | null;
  done: boolean;
  dependsOnId?: string | null;
}

interface ParentTask {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  subtasks: SubTask[];
}

type SubtaskItem = { subtask: SubTask; parent: ParentTask };

// ─── Data ─────────────────────────────────────────────────────────────────────
const MEMBERS: Record<string, { name: string; color: string }> = {
  OK: { name: 'Omar Khalil',  color: '#2563EB' },
  AN: { name: 'Ahmed Nour',   color: '#7C3AED' },
  NS: { name: 'Nora Salem',   color: '#D97706' },
  SA: { name: 'Sara Ahmed',   color: '#D4500A' },
  LH: { name: 'Lina Hassan',  color: '#16A34A' },
};


const COLUMNS: { id: Status; label: string; dotColor: string }[] = [
  { id: 'TODO',        label: 'To Do',       dotColor: 'var(--text-muted)' },
  { id: 'IN_PROGRESS', label: 'In Progress', dotColor: 'var(--amber)'      },
  { id: 'DONE',        label: 'Done',        dotColor: 'var(--green)'      },
];

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',  label: 'All'           },
  { id: 'mine', label: 'Mine'          },
  { id: 'high', label: 'High Priority' },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'all',     label: 'All Time'   },
  { id: 'week',    label: 'This Week'  },
  { id: 'month',   label: 'This Month' },
  { id: 'overdue', label: 'Overdue'    },
];

const VIEW_MODES: { id: ViewMode; icon: string }[] = [
  { id: 'kanban',   icon: '⊞' },
  { id: 'list',     icon: '☰' },
  { id: 'calendar', icon: '◫' },
];

// ─── Style maps ───────────────────────────────────────────────────────────────
const PRIORITY_CLS: Record<Priority, string> = {
  HIGH:   'bg-[var(--red-light)]   text-[var(--red)]',
  MEDIUM: 'bg-[var(--amber-light)] text-[var(--amber)]',
  LOW:    'bg-[var(--border)]      text-[var(--text-secondary)]',
};

const PRIORITY_DOT_COLOR: Record<Priority, string> = {
  HIGH:   'var(--red)',
  MEDIUM: 'var(--amber)',
  LOW:    'var(--text-muted)',
};

const PRIORITY_CHIP_STYLE: Record<Priority, { background: string; color: string }> = {
  HIGH:   { background: 'var(--red-light)',   color: 'var(--red)'            },
  MEDIUM: { background: 'var(--amber-light)', color: 'var(--amber)'          },
  LOW:    { background: 'var(--border)',       color: 'var(--text-secondary)' },
};

const STATUS_CLS: Record<Status, string> = {
  TODO:        'bg-[var(--border)]      text-[var(--text-secondary)]',
  IN_PROGRESS: 'bg-[var(--amber-light)] text-[var(--amber)]',
  DONE:        'bg-[var(--green-light)] text-[var(--green)]',
};

const STATUS_LABEL: Record<Status, string> = {
  TODO:        'To Do',
  IN_PROGRESS: 'In Progress',
  DONE:        'Done',
};

const CURRENT_USER = 'SA';

// May 2025 calendar constants
const MAY_START_OFFSET = 3; // May 1 = Thursday (Mon=0)
const MAY_DAYS         = 31;
const TODAY_DAY        = 7; // May 7
const DAY_LABELS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isLocked(subtask: SubTask, allSubtasks: SubTask[]): boolean {
  if (!subtask.dependsOnId) return false;
  const dep = allSubtasks.find(st => st.id === subtask.dependsOnId);
  return dep !== undefined && !dep.done;
}

function groupByParent(items: SubtaskItem[]): { parent: ParentTask; items: SubtaskItem[] }[] {
  const seen = new Set<string>();
  const groups: { parent: ParentTask; items: SubtaskItem[] }[] = [];
  for (const item of items) {
    if (!seen.has(item.parent.id)) {
      seen.add(item.parent.id);
      groups.push({ parent: item.parent, items: [] });
    }
    groups.find(g => g.parent.id === item.parent.id)!.items.push(item);
  }
  return groups;
}

// ─── SubtaskCard (Kanban primary card) ────────────────────────────────────────
function SubtaskCard({
  subtask,
  parent,
  expanded,
  onToggleExpand,
  onToggleDone,
  onNoteChange,
}: {
  subtask:        SubTask;
  parent:         ParentTask;
  expanded:       boolean;
  onToggleExpand: () => void;
  onToggleDone:   () => void;
  onNoteChange:   (note: string) => void;
}) {
  const member     = subtask.assigneeId ? MEMBERS[subtask.assigneeId] : undefined;
  const locked     = isLocked(subtask, parent.subtasks);
  const depSubtask = subtask.dependsOnId
    ? parent.subtasks.find(st => st.id === subtask.dependsOnId)
    : null;

  const LABEL = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.4px',
    width: 82, flexShrink: 0,
  };

  return (
    <div
      className="bg-[var(--surface)] rounded-lg overflow-hidden shadow-sm"
      style={{
        border: expanded ? '1px solid var(--accent)' : '1px solid var(--border)',
        transition: 'box-shadow var(--transition), border-color var(--transition)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '';                 }}
    >
      {/* ── Card face ──────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={onToggleExpand}>

        {/* Top row: priority tag + due date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{ ...PRIORITY_CHIP_STYLE[parent.priority], padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 20 }}
          >
            {parent.priority}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtask.dueDate}</span>
        </div>

        {/* Title */}
        <p
          style={{
            fontSize: 13.5, fontWeight: 600, marginTop: 6, marginBottom: 0, lineHeight: 1.4,
            color:          subtask.done || locked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: subtask.done ? 'line-through' : 'none',
            fontStyle:      locked ? 'italic' : 'normal',
          }}
        >
          {locked && '🔒 '}
          {subtask.title}
        </p>

        {/* Note */}
        {subtask.note && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0, fontStyle: 'italic' }}>
            💬 {subtask.note}
          </p>
        )}

        {/* Bottom row: member avatar + name  |  checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: member?.color ?? '#888',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'white',
              }}
            >
              {subtask.assigneeId}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member?.name ?? '—'}</span>
          </div>

          {locked ? (
            <span style={{ fontSize: 13, lineHeight: 1 }}>🔒</span>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onToggleDone(); }}
              style={{
                width: 18, height: 18, borderRadius: '50%', padding: 0, flexShrink: 0,
                background: subtask.done ? 'var(--green)' : 'transparent',
                border:     subtask.done ? 'none' : '1.5px solid var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {subtask.done && (
                <span style={{ color: 'white', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded detail ────────────────────────────────────── */}
      <div style={{ maxHeight: expanded ? '600px' : '0', overflow: 'hidden', transition: 'max-height 0.28s ease' }}>
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px' }}>

          {/* Meta rows */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
            <span style={LABEL}>Part of</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {parent.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <span style={LABEL}>Assigned to</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: member?.color ?? '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: 'white',
                }}
              >
                {subtask.assigneeId}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{member?.name ?? '—'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <span style={LABEL}>Due date</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{subtask.dueDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={LABEL}>Status</span>
            <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold', STATUS_CLS[parent.status])}>
              {STATUS_LABEL[parent.status]}
            </span>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px dashed var(--border)', margin: '12px 0' }} />

          {/* Dependency */}
          {depSubtask && (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 0' }}>
                ⟶ Depends on: {depSubtask.title}
              </p>
              <div style={{ borderTop: '1px dashed var(--border)', margin: '12px 0' }} />
            </>
          )}

          {/* Note textarea */}
          <textarea
            value={subtask.note ?? ''}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add a note…"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', display: 'block',
              background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '10px',
              fontSize: 13, minHeight: 56, resize: 'none',
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
              outline: 'none',
            }}
          />

          {/* Mark as done */}
          {!subtask.done && !locked && (
            <button
              onClick={e => { e.stopPropagation(); onToggleDone(); }}
              className="mt-3 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[var(--green-light)] text-[var(--green)] hover:opacity-80 [transition:var(--transition)] cursor-pointer"
            >
              ✓ Mark as done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ListSubtaskRow ───────────────────────────────────────────────────────────
function ListSubtaskRow({
  subtask,
  parent,
  isLast,
  onToggleDone,
}: {
  subtask:      SubTask;
  parent:       ParentTask;
  isLast:       boolean;
  onToggleDone: () => void;
}) {
  const member = subtask.assigneeId ? MEMBERS[subtask.assigneeId] : undefined;
  const locked = isLocked(subtask, parent.subtasks);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 150px 80px 90px 36px',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background var(--transition)',
      }}
      className="hover:bg-[var(--bg)]"
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingRight: 12 }}>
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: PRIORITY_DOT_COLOR[parent.priority],
          }}
        />
        <span
          style={{
            fontSize: 13, fontWeight: 500,
            color:          subtask.done || locked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: subtask.done ? 'line-through' : 'none',
            fontStyle:      locked ? 'italic' : 'normal',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {locked && '🔒 '}{subtask.title}
        </span>
      </div>

      {/* Assignee */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: member?.color ?? '#888',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'white',
          }}
        >
          {subtask.assigneeId}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member?.name ?? '—'}
        </span>
      </div>

      {/* Due */}
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtask.dueDate}</span>

      {/* Priority */}
      <div>
        <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize', PRIORITY_CLS[parent.priority])}>
          {parent.priority}
        </span>
      </div>

      {/* Checkbox */}
      {locked ? (
        <span style={{ fontSize: 13, textAlign: 'center' }}>🔒</span>
      ) : (
        <button
          onClick={onToggleDone}
          style={{
            width: 18, height: 18, borderRadius: '50%', padding: 0, margin: '0 auto', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: subtask.done ? 'var(--green)' : 'transparent',
            border:     subtask.done ? 'none' : '1.5px solid var(--border-strong)',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          {subtask.done && (
            <span style={{ color: 'white', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>
          )}
        </button>
      )}
    </div>
  );
}

// ─── CalendarView ─────────────────────────────────────────────────────────────
function CalendarView({ items }: { items: SubtaskItem[] }) {
  const cells: (number | null)[] = [
    ...Array(MAY_START_OFFSET).fill(null),
    ...Array.from({ length: MAY_DAYS }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const byDay: Record<number, SubtaskItem[]> = {};
  items.forEach(item => {
    const m = item.subtask.dueDate?.match(/^May (\d+)$/);
    if (m) {
      const d = parseInt(m[1]);
      byDay[d] = byDay[d] ? [...byDay[d], item] : [item];
    }
  });

  const mayCount = items.filter(({ subtask }) => subtask.dueDate?.startsWith('May')).length;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Month header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[15px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
          May 2025
        </span>
        <span className="text-[12px] text-[var(--text-muted)]">{mayCount} tasks this month</span>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {DAY_LABELS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[var(--border)] last:border-b-0">
          {week.map((day, di) => {
            const dayItems = day ? (byDay[day] ?? []) : [];
            const isToday  = day === TODAY_DAY;
            return (
              <div
                key={di}
                className={clsx(
                  'min-h-[90px] p-2 border-r border-[var(--border)] last:border-r-0',
                  !day && 'bg-[var(--bg)]',
                )}
              >
                {day && (
                  <>
                    <div className="flex justify-end mb-1">
                      <span
                        className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold',
                          isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]',
                        )}
                      >
                        {day}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayItems.slice(0, 2).map(({ subtask, parent }) => (
                        <div
                          key={subtask.id}
                          className="rounded px-1 py-0.5 text-[10px] font-semibold truncate"
                          style={PRIORITY_CHIP_STYLE[parent.priority]}
                        >
                          {subtask.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <span className="text-[10px] text-[var(--text-muted)] px-1">
                          +{dayItems.length - 2} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Tasks page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { tasks, toggleSubtask: storeToggle } = useTasksStore();
  const { currentWorkspace } = useAuthStore();
  const [filter,            setFilter]            = useState<Filter>('all');
  const [dateFilter,        setDateFilter]        = useState<DateFilter>('all');
  const [viewMode,          setViewMode]          = useState<ViewMode>('kanban');
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [ddOpen,            setDdOpen]            = useState(false);
  const [toastMsg,          setToastMsg]          = useState('');
  const [toastVisible,      setToastVisible]      = useState(false);

  const ddRef      = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message: string) => {
    setToastMsg(message);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
  };

  const handleSubtaskToggle = (parentId: string, subtaskId: string) => {
    if (!currentWorkspace) return;
    const parent  = tasks.find(p => p.id === parentId);
    const subtask = parent?.subtasks.find(st => st.id === subtaskId);
    if (parent && subtask) {
      if (!subtask.done) {
        const dependent = parent.subtasks.find(st => st.dependsOnId === subtaskId && !st.done);
        if (dependent) {
          const memberName = dependent.assigneeId
            ? (MEMBERS[dependent.assigneeId]?.name ?? dependent.assigneeId)
            : 'the team';
          showToast(`🔔 ${dependent.title} is now unlocked for ${memberName}`);
        }
      }
      storeToggle(currentWorkspace.id, parentId, subtaskId, !subtask.done);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNoteChange = (_parentId: string, _subtaskId: string, _note: string) => {
    // note editing will be wired to backend in a future update
  };

  // Flat list of all subtasks with parent context, preserving definition order
  const allItems: SubtaskItem[] = tasks.flatMap(p =>
    p.subtasks.map(st => ({ subtask: st, parent: p }))
  );

  const applyFilter = (items: SubtaskItem[]): SubtaskItem[] => {
    let r = items;
    if (filter === 'mine') r = r.filter(({ subtask }) => subtask.assigneeId === CURRENT_USER);
    if (filter === 'high') r = r.filter(({ parent }) => parent.priority === 'HIGH');
    if (dateFilter !== 'all') {
      r = r.filter(({ subtask }) => {
        const due = subtask.dueDate;
        if (!due) return false;
        if (dateFilter === 'week')    return /^May\s+(5|6|7|8|9|10|11)$/.test(due);
        if (dateFilter === 'month')   return due.startsWith('May');
        if (dateFilter === 'overdue') return due.startsWith('Apr') || /^May\s+[1-6]$/.test(due);
        return true;
      });
    }
    return r;
  };

  const filteredItems    = applyFilter(allItems);
  const currentDateLabel = DATE_FILTERS.find(d => d.id === dateFilter)?.label ?? 'All Time';

  // Calendar: no date filter, so all May dates stay visible
  const calendarItems = (() => {
    let r = allItems;
    if (filter === 'mine') r = r.filter(({ subtask }) => subtask.assigneeId === CURRENT_USER);
    if (filter === 'high') r = r.filter(({ parent }) => parent.priority === 'HIGH');
    return r;
  })();

  return (
    <div className="max-w-[1080px] mx-auto px-10 pt-10 pb-20">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[28px] text-[var(--text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Tasks
        </h1>

        <div className="flex items-center gap-3">

          {/* Date dropdown */}
          <div className="relative" ref={ddRef}>
            <button
              onClick={() => setDdOpen(o => !o)}
              className="flex items-center gap-1.5 px-[14px] py-1.5 rounded-full text-[12px] font-semibold border [transition:var(--transition)] cursor-pointer bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]"
            >
              📅 {currentDateLabel}
              <span
                className="inline-block text-[10px] opacity-60"
                style={{ transform: ddOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
              >
                ▾
              </span>
            </button>
            {ddOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-[20] bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden min-w-[140px]"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                {DATE_FILTERS.map(df => (
                  <button
                    key={df.id}
                    onClick={() => { setDateFilter(df.id); setDdOpen(false); }}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 text-[12px] font-medium [transition:var(--transition)] cursor-pointer',
                      dateFilter === df.id
                        ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]',
                    )}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority filter pills */}
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  'px-[14px] py-1.5 rounded-full text-[12px] font-semibold border [transition:var(--transition)] cursor-pointer',
                  filter === f.id
                    ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]'
                    : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-0.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-0.5">
            {VIEW_MODES.map(vm => (
              <button
                key={vm.id}
                onClick={() => setViewMode(vm.id)}
                title={vm.id.charAt(0).toUpperCase() + vm.id.slice(1)}
                className={clsx(
                  'w-8 h-7 rounded-[6px] flex items-center justify-center text-[14px] [transition:var(--transition)] cursor-pointer',
                  viewMode === vm.id
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                )}
              >
                {vm.icon}
              </button>
            ))}
          </div>

          {/* New Task */}
          <button className="bg-[var(--accent)] text-white rounded-lg py-2 px-4 text-[13px] font-semibold cursor-pointer hover:opacity-90 [transition:var(--transition)]">
            ＋ New Task
          </button>
        </div>
      </div>

      {/* ── Kanban view ──────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map(col => {
            const colItems  = filteredItems.filter(({ parent }) => parent.status === col.id);
            const colGroups = groupByParent(colItems);

            return (
              <div
                key={col.id}
                className="min-w-[300px] flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden"
              >
                {/* Column header */}
                <div className="flex items-center justify-between py-[14px] px-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dotColor }} />
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">{col.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--border)] px-2 py-px rounded-[10px]">
                    {colItems.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="p-2.5 min-h-[120px]">
                  {colGroups.map(({ parent, items }, gi) => (
                    <div key={parent.id}>
                      {/* Parent separator */}
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          margin: gi === 0 ? '2px 0 6px' : '10px 0 6px',
                        }}
                      >
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span
                          style={{
                            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                            letterSpacing: '0.3px', textTransform: 'uppercase',
                            whiteSpace: 'nowrap', maxWidth: '75%',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {parent.title}
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>

                      {/* Subtask cards */}
                      <div className="flex flex-col gap-1.5">
                        {items.map(({ subtask }) => (
                          <SubtaskCard
                            key={subtask.id}
                            subtask={subtask}
                            parent={parent}
                            expanded={expandedSubtaskId === subtask.id}
                            onToggleExpand={() =>
                              setExpandedSubtaskId(prev => prev === subtask.id ? null : subtask.id)
                            }
                            onToggleDone={() => handleSubtaskToggle(parent.id, subtask.id)}
                            onNoteChange={note => handleNoteChange(parent.id, subtask.id, note)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Add task */}
                  <div className="border-[1.5px] border-dashed border-[var(--border)] rounded-lg p-2.5 text-center text-[13px] text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] [transition:var(--transition)] mt-2">
                    ＋ Add task
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List view ────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div>
          {/* Column header */}
          <div
            className="grid px-4 pb-2 mb-0.5"
            style={{ gridTemplateColumns: '1fr 150px 80px 90px 36px' }}
          >
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Subtask</span>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Assignee</span>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Due</span>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Priority</span>
            <span />
          </div>

          {/* Grouped by parent */}
          {groupByParent(filteredItems).map(({ parent, items }) => (
            <div key={parent.id} className="mb-2">
              {/* Parent header */}
              <div
                style={{
                  background: 'var(--bg)',
                  padding: '8px 20px',
                  fontSize: 12, fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  border: '1px solid var(--border)',
                  borderBottom: 'none',
                }}
              >
                {parent.title}
              </div>

              {/* Subtask rows */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                }}
              >
                {items.map(({ subtask }, i) => (
                  <ListSubtaskRow
                    key={subtask.id}
                    subtask={subtask}
                    parent={parent}
                    isLast={i === items.length - 1}
                    onToggleDone={() => handleSubtaskToggle(parent.id, subtask.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-[13px] text-[var(--text-muted)]">
              No tasks match the current filters.
            </div>
          )}
        </div>
      )}

      {/* ── Calendar view ────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <CalendarView items={calendarItems} />
      )}

      {/* ── Toast ────────────────────────────────────────────── */}
      <Toast message={toastMsg} visible={toastVisible} />

    </div>
  );
}
