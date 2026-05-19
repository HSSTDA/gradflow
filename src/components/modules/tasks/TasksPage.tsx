'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import Toast from '@/components/ui/Toast';
import { useTasksStore } from '@/store/tasksStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { createNotification } from '@/lib/notify';

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
  assignee?: { id: string; name: string; avatarUrl?: string } | null;
  dueDate: string | null;
  note: string | null;
  done: boolean;
  dependsOnId?: string | null;
  dependsOn?: { id: string; title: string; done: boolean } | null;
}

interface ParentTask {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  subtasks: SubTask[];
}

type SubtaskItem = SubTask & { parentTask: ParentTask };

interface Member { id: string; name: string; avatarUrl?: string }

// ─── Constants ────────────────────────────────────────────────────────────────
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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Style maps ───────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#D4500A', '#2563EB', '#16A34A', '#7C3AED', '#D97706', '#0891B2', '#DC2626'];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDueDate(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  try {
    return new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return null; }
}

function isLocked(subtask: SubTask, allSubtasks: SubTask[]): boolean {
  if (!subtask.dependsOnId) return false;
  const dep = allSubtasks.find(st => st.id === subtask.dependsOnId);
  return dep !== undefined && !dep.done;
}

// ─── AssigneeAvatar ───────────────────────────────────────────────────────────
function AssigneeAvatar({ assignee, size = 24 }: { assignee: { name: string } | null | undefined; size?: number }) {
  if (!assignee) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: avatarColor(assignee.name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.42), fontWeight: 700, color: 'white',
      }}>
        {getInitials(assignee.name)}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{assignee.name}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseNote(note: string | null): { notifyUserId: string; cleanNote: string } {
  if (!note) return { notifyUserId: '', cleanNote: '' };
  if (note.startsWith('notify:')) {
    const after   = note.slice('notify:'.length);
    const pipeIdx = after.indexOf('|');
    return pipeIdx >= 0
      ? { notifyUserId: after.slice(0, pipeIdx), cleanNote: after.slice(pipeIdx + 1) }
      : { notifyUserId: after, cleanNote: '' };
  }
  return { notifyUserId: '', cleanNote: note };
}

// ─── SubtaskKanbanCard ────────────────────────────────────────────────────────
function SubtaskKanbanCard({
  subtask, parent, status, expanded,
  onToggleExpand, onStatusChange, onDelete, workspaceId, onRefresh,
}: {
  subtask: SubTask; parent: ParentTask; status: Status; expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (s: Status) => void;
  onDelete: () => void;
  workspaceId: string;
  onRefresh: () => Promise<void>;
}) {
  const [showEdit,         setShowEdit]         = useState(false);
  const [editTitle,        setEditTitle]        = useState(subtask.title);
  const [editAssignee,     setEditAssignee]     = useState(subtask.assigneeId ?? '');
  const [editDueDate,      setEditDueDate]      = useState(subtask.dueDate ?? '');
  const [editDependsOnId,  setEditDependsOnId]  = useState(subtask.dependsOnId ?? '');
  const [editNotifyUserId, setEditNotifyUserId] = useState(() => parseNote(subtask.note).notifyUserId);
  const [editCleanNote,    setEditCleanNote]    = useState(() => parseNote(subtask.note).cleanNote);
  const [editLoading,      setEditLoading]      = useState(false);
  const [members,          setMembers]          = useState<Member[]>([]);
  const [membersLoading,   setMembersLoading]   = useState(false);

  useEffect(() => {
    if (!showEdit) return;
    setMembersLoading(true);
    api.workspaces.members(workspaceId).then(res => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (res.success) setMembers(((res.data as any).members) as Member[]);
      setMembersLoading(false);
    });
  }, [showEdit, workspaceId]);

  useEffect(() => {
    const parsed = parseNote(subtask.note);
    setEditTitle(subtask.title);
    setEditAssignee(subtask.assigneeId ?? '');
    setEditDueDate(subtask.dueDate ?? '');
    setEditDependsOnId(subtask.dependsOnId ?? '');
    setEditNotifyUserId(parsed.notifyUserId);
    setEditCleanNote(parsed.cleanNote);
  }, [subtask.title, subtask.assigneeId, subtask.dueDate, subtask.note, subtask.dependsOnId]);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setEditLoading(true);
    const savedNote = editNotifyUserId
      ? `notify:${editNotifyUserId}|${editCleanNote}`
      : (editCleanNote || null);
    await api.tasks.updateSubtask(workspaceId, parent.id, subtask.id, {
      title:       editTitle.trim(),
      assigneeId:  editAssignee || null,
      dueDate:     editDueDate || null,
      note:        savedNote,
      dependsOnId: editDependsOnId || null,
    });
    await onRefresh();
    setShowEdit(false);
    setEditLoading(false);
  };

  const cancelEdit = () => {
    const parsed = parseNote(subtask.note);
    setShowEdit(false);
    setEditTitle(subtask.title);
    setEditAssignee(subtask.assigneeId ?? '');
    setEditDueDate(subtask.dueDate ?? '');
    setEditDependsOnId(subtask.dependsOnId ?? '');
    setEditNotifyUserId(parsed.notifyUserId);
    setEditCleanNote(parsed.cleanNote);
  };

  const locked       = isLocked(subtask, parent.subtasks);
  const formattedDue = formatDueDate(subtask.dueDate);

  const MINI: React.CSSProperties = {
    width: '100%', padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6,
    fontSize: 12, fontFamily: 'var(--font-body)', background: 'var(--bg)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        border: expanded ? '1px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)', transition: 'box-shadow var(--transition), border-color var(--transition)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      {/* Card header (click to expand) */}
      <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={onToggleExpand}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 5px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {parent.title}
        </p>

        <p
          title={locked ? `Waiting for: ${subtask.dependsOn?.title ?? 'another to-do'}` : undefined}
          style={{
            fontSize: 14, fontWeight: 600, margin: '0 0 10px', lineHeight: 1.35,
            color: status === 'DONE' || locked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: status === 'DONE' ? 'line-through' : 'none',
            fontStyle: locked ? 'italic' : 'normal',
            cursor: locked ? 'help' : 'pointer',
          }}
        >
          {locked && '🔒 '}{subtask.title}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <AssigneeAvatar assignee={subtask.assignee} size={20} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {formattedDue && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 {formattedDue}</span>
            )}
            <span style={{ ...PRIORITY_CHIP_STYLE[parent.priority], padding: '1px 7px', fontSize: 10, fontWeight: 700, borderRadius: 20 }}>
              {parent.priority}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <div style={{ maxHeight: expanded ? '800px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Part of: <strong style={{ color: 'var(--text-secondary)' }}>{parent.title}</strong>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', width: 44, flexShrink: 0 }}>Status</span>
            <select
              value={status}
              disabled={locked}
              onClick={e => e.stopPropagation()}
              onChange={e => onStatusChange(e.target.value as Status)}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', outline: 'none' }}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {!showEdit ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); setShowEdit(true); }}
                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
              >✏ Edit</button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, background: 'var(--red-light)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >🗑 Delete</button>
            </div>
          ) : (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                placeholder="Subtask title" autoFocus style={MINI}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)} disabled={membersLoading} style={MINI}>
                  <option value="">{membersLoading ? 'Loading…' : 'Unassigned'}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={MINI} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={editDependsOnId} onChange={e => setEditDependsOnId(e.target.value)} style={MINI}>
                  <option value="">Depends on: None</option>
                  {parent.subtasks.filter(s => s.id !== subtask.id).map(s => (
                    <option key={s.id} value={s.id}>To-do: {s.title || 'Untitled'}</option>
                  ))}
                </select>
                <select value={editNotifyUserId} onChange={e => setEditNotifyUserId(e.target.value)} disabled={membersLoading} style={MINI}>
                  <option value="">{membersLoading ? 'Loading…' : 'Notify: No one'}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <textarea
                value={editCleanNote} onChange={e => setEditCleanNote(e.target.value)}
                placeholder="Note (optional)"
                style={{ ...MINI, minHeight: 52, resize: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading || !editTitle.trim()}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    fontFamily: 'var(--font-body)', transition: 'var(--transition)',
                    cursor: editLoading || !editTitle.trim() ? 'not-allowed' : 'pointer',
                    background: editLoading || !editTitle.trim() ? 'var(--accent-light)' : 'var(--accent)',
                    color: editLoading || !editTitle.trim() ? 'var(--accent)' : 'white',
                  }}
                >{editLoading ? 'Saving…' : 'Save'}</button>
                <button
                  onClick={cancelEdit}
                  style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ParentTasksPanel ─────────────────────────────────────────────────────────
function ParentTasksPanel({
  tasks, onEdit, onDelete,
}: {
  tasks: ParentTask[];
  onEdit: (task: ParentTask) => void;
  onDelete: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', marginBottom: 20,
      boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Task Groups</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
            {tasks.length}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-block', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {tasks.length === 0 ? (
            <p style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No task groups yet.</p>
          ) : tasks.map((task, i) => (
            <div key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderBottom: i === tasks.length - 1 ? 'none' : '1px solid var(--border)',
                transition: 'background var(--transition)',
              }}
              className="hover:bg-[var(--bg)]"
            >
              <span style={{ ...PRIORITY_CHIP_STYLE[task.priority], padding: '2px 7px', fontSize: 10, fontWeight: 700, borderRadius: 20, flexShrink: 0 }}>
                {task.priority}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} done
              </span>
              <button
                onClick={() => onEdit(task)}
                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', transition: 'var(--transition)', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >✏ Edit</button>
              <button
                onClick={() => onDelete(task.id)}
                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'var(--red-light)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--red)', fontFamily: 'var(--font-body)', transition: 'var(--transition)', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NewTaskModal ─────────────────────────────────────────────────────────────
interface SubtaskRow {
  _key: string; title: string; assigneeId: string; dueDate: string; note: string;
  dependsOnIndex: number | null;
  notifyUserId: string;
}

function emptyRow(): SubtaskRow {
  return { _key: Math.random().toString(36).slice(2), title: '', assigneeId: '', dueDate: '', note: '', dependsOnIndex: null, notifyUserId: '' };
}

function NewTaskModal({
  isEditing, title, onTitleChange, priority, onPriorityChange,
  rows, onRowsChange, loading, error, onSubmit, onClose,
}: {
  isEditing: boolean;
  title: string; onTitleChange: (v: string) => void;
  priority: Priority; onPriorityChange: (v: Priority) => void;
  rows: SubtaskRow[]; onRowsChange: (r: SubtaskRow[]) => void;
  loading: boolean; error: string;
  onSubmit: () => void; onClose: () => void;
}) {
  const { currentWorkspace } = useAuthStore();
  const workspaceId          = currentWorkspace?.id;
  const [members,        setMembers]        = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) { setMembersLoading(false); return; }
    api.workspaces.members(workspaceId).then(res => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (res.success) setMembers(((res.data as any).members) as Member[]);
      setMembersLoading(false);
    });
  }, [workspaceId]);

  const updateRow = (key: string, patch: Partial<SubtaskRow>) =>
    onRowsChange(rows.map(r => r._key === key ? { ...r, ...patch } : r));
  const removeRow = (key: string) => onRowsChange(rows.filter(r => r._key !== key));

  const FIELD: React.CSSProperties = {
    width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font-body)',
    background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };
  const SELECT_MAIN: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font-body)',
    background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };
  const LBL: React.CSSProperties  = { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' };
  const RLBL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>
            {isEditing ? 'Edit Task Group' : 'New Task Group'}
          </h2>
          <button onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)', transition: 'var(--transition)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >✕</button>
        </div>

        {error && (
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', fontSize: 13, fontWeight: 500, padding: '9px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LBL}>Group Title</label>
            <input type="text" value={title} onChange={e => onTitleChange(e.target.value)}
              placeholder="e.g. Build Authentication System" autoFocus style={SELECT_MAIN} />
          </div>
          <div>
            <label style={LBL}>Priority</label>
            <select value={priority} onChange={e => onPriorityChange(e.target.value as Priority)} style={SELECT_MAIN}>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {!isEditing && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>To-dos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map((row, rowIndex) => {
                const depRow      = row.dependsOnIndex !== null ? rows[row.dependsOnIndex] : null;
                const depTitle    = depRow ? (depRow.title.trim() || `To-do #${(row.dependsOnIndex as number) + 1}`) : null;
                const minDueDate  = depRow?.dueDate ? (() => {
                  const d = new Date(depRow.dueDate + 'T00:00:00');
                  d.setDate(d.getDate() + 1);
                  return d.toISOString().split('T')[0];
                })() : undefined;
                return (
                <div key={row._key} style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '12px 14px', position: 'relative' }}>
                  <button onClick={() => removeRow(row._key)}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '2px 5px', borderRadius: 'var(--radius-sm)', transition: 'var(--transition)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                  >✕</button>

                  {/* Row 1: Title */}
                  <div style={{ marginBottom: 10, paddingRight: 28 }}>
                    <label style={RLBL}>To-do Title</label>
                    <input type="text" value={row.title} onChange={e => updateRow(row._key, { title: e.target.value })}
                      placeholder="e.g. Write the introduction" style={FIELD} />
                  </div>

                  {/* Row 2: Assigned To + Due Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={RLBL}>Assigned To</label>
                      <select value={row.assigneeId} onChange={e => updateRow(row._key, { assigneeId: e.target.value })}
                        style={FIELD} disabled={membersLoading}>
                        <option value="">{membersLoading ? 'Loading…' : 'Unassigned'}</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={RLBL}>Due Date</label>
                      <input type="date" value={row.dueDate} min={minDueDate} onChange={e => updateRow(row._key, { dueDate: e.target.value })} style={FIELD} />
                      {depTitle && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', margin: '3px 0 0' }}>
                          ⟶ Starts after: {depTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Depends On + Notify When Done */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={RLBL}>Depends On</label>
                      <select
                        value={row.dependsOnIndex ?? ''}
                        onChange={e => updateRow(row._key, { dependsOnIndex: e.target.value === '' ? null : Number(e.target.value) })}
                        style={FIELD}
                      >
                        <option value="">None</option>
                        {rows.map((r, i) => i !== rowIndex && (
                          <option key={r._key} value={i}>
                            {r.title.trim() || `To-do #${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={RLBL}>Notify When Done</label>
                      <select
                        value={row.notifyUserId}
                        onChange={e => updateRow(row._key, { notifyUserId: e.target.value })}
                        style={FIELD}
                        disabled={membersLoading}
                      >
                        <option value="">{membersLoading ? 'Loading…' : 'No one'}</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Note */}
                  <div>
                    <label style={RLBL}>Note</label>
                    <input type="text" value={row.note} onChange={e => updateRow(row._key, { note: e.target.value })}
                      placeholder="Optional note…" style={FIELD} />
                  </div>
                </div>
                );
              })}
            </div>
            <button
              onClick={() => onRowsChange([...rows, emptyRow()])}
              style={{ width: '100%', marginTop: 8, padding: '8px 0', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >＋ Add to-do</button>
          </div>
        )}

        <button onClick={onSubmit} disabled={loading}
          style={{ width: '100%', marginTop: 24, padding: '11px 0', background: loading ? 'var(--accent-light)' : 'var(--accent)', color: loading ? 'var(--accent)' : 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}>
          {loading ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Changes' : 'Create Task Group')}
        </button>
        <button onClick={onClose}
          style={{ width: '100%', marginTop: 8, padding: '11px 0', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >Cancel</button>
      </div>
    </div>
  );
}

// ─── CalendarView ─────────────────────────────────────────────────────────────
function CalendarView({
  items, getSubtaskStatus, openMenuId, onMenuToggle, onMenuClose, onEdit, onDelete, onStatusChange,
}: {
  items: SubtaskItem[];
  getSubtaskStatus: (s: SubTask) => Status;
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onEdit: (task: ParentTask) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (subtask: SubtaskItem, status: Status) => void;
}) {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const today       = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDaySun = new Date(year, month, 1).getDay();
  const startOffset = (firstDaySun + 6) % 7;
  const monthLabel  = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const byDay: Record<number, SubtaskItem[]> = {};
  items.forEach(item => {
    const due = item.dueDate;
    if (!due) return;
    const d = new Date(due + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay[day] = byDay[day] ? [...byDay[day], item] : [item];
    }
  });

  const monthCount = Object.values(byDay).flat().length;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[15px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
          {monthLabel}
        </span>
        <span className="text-[12px] text-[var(--text-muted)]">{monthCount} tasks this month</span>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {DAY_LABELS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[var(--border)] last:border-b-0">
          {week.map((day, di) => {
            const dayItems = day ? (byDay[day] ?? []) : [];
            const isToday  = day === today;
            return (
              <div key={di} className={clsx('min-h-[90px] p-2 border-r border-[var(--border)] last:border-r-0', !day && 'bg-[var(--bg)]')}>
                {day && (
                  <>
                    <div className="flex justify-end mb-1">
                      <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold',
                        isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]')}>
                        {day}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayItems.slice(0, 3).map(item => {
                        const st = getSubtaskStatus(item);
                        return (
                          <div key={item.id} style={{ position: 'relative' }}>
                            <div
                              className="rounded px-1 py-0.5 text-[10px] font-semibold truncate cursor-pointer hover:opacity-80"
                              style={{ ...PRIORITY_CHIP_STYLE[item.parentTask.priority], transition: 'var(--transition)' }}
                              onClick={e => { e.stopPropagation(); onMenuToggle(item.id); }}
                            >
                              {item.title}
                            </div>
                            {openMenuId === item.id && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, zIndex: 30,
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                                minWidth: 160, overflow: 'hidden', marginTop: 2,
                              }}>
                                {([
                                  { label: '↳ To Do',       val: 'TODO'        as Status },
                                  { label: '→ In Progress', val: 'IN_PROGRESS' as Status },
                                  { label: '✓ Done',        val: 'DONE'        as Status },
                                ]).map(({ label, val }) => (
                                  <button key={val}
                                    onClick={e => { e.stopPropagation(); onMenuClose(); onStatusChange(item, val); }}
                                    style={{
                                      width: '100%', padding: '8px 12px', border: 'none',
                                      background: st === val ? 'var(--accent-light)' : 'none',
                                      cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: 'var(--font-body)',
                                      color: st === val ? 'var(--accent)' : 'var(--text-secondary)',
                                      fontWeight: st === val ? 700 : 500,
                                      display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)',
                                    }}
                                    onMouseEnter={e => { if (st !== val) e.currentTarget.style.background = 'var(--bg)'; }}
                                    onMouseLeave={e => { if (st !== val) e.currentTarget.style.background = 'none'; }}
                                  >{label}</button>
                                ))}
                                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                                <button
                                  onClick={e => { e.stopPropagation(); onMenuClose(); onEdit(item.parentTask); }}
                                  style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >✏ Edit Group</button>
                                <button
                                  onClick={e => { e.stopPropagation(); onMenuClose(); onDelete(item.parentTask.id); }}
                                  style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: 'var(--red)', fontWeight: 500, fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-light)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >🗑 Delete Group</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span className="text-[10px] text-[var(--text-muted)] px-1">+{dayItems.length - 3} more</span>
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

// ─── TasksPage ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { tasks, fetchTasks } = useTasksStore();
  const { currentWorkspace, user } = useAuthStore();
  const currentUser = user;
  const workspaceId = currentWorkspace?.id;

  const [filter,            setFilter]            = useState<Filter>('all');
  const [dateFilter,        setDateFilter]        = useState<DateFilter>('all');
  const [viewMode,          setViewMode]          = useState<ViewMode>('kanban');
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [ddOpen,            setDdOpen]            = useState(false);
  const [toastMsg,          setToastMsg]          = useState('');
  const [toastVisible,      setToastVisible]      = useState(false);
  const [showModal,         setShowModal]         = useState(false);
  const [openMenuId,        setOpenMenuId]        = useState<string | null>(null);
  const [inProgressIds,     setInProgressIds]     = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workspaceMembers,  setWorkspaceMembers]  = useState<any[]>([]);

  const [editingTask,   setEditingTask]   = useState<ParentTask | null>(null);
  const [modalTitle,    setModalTitle]    = useState('');
  const [modalPriority, setModalPriority] = useState<Priority>('MEDIUM');
  const [modalRows,     setModalRows]     = useState<SubtaskRow[]>([emptyRow()]);
  const [modalLoading,  setModalLoading]  = useState(false);
  const [modalError,    setModalError]    = useState('');

  const ddRef      = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!workspaceId) return;
    api.workspaces.members(workspaceId).then(res => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (res.success) setWorkspaceMembers(((res.data as any).members));
    });
  }, [workspaceId]);

  const showToast = (msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
  };

  const getSubtaskStatus = (subtask: SubTask): Status => {
    if (subtask.done) return 'DONE';
    if (inProgressIds.has(subtask.id)) return 'IN_PROGRESS';
    return 'TODO';
  };

  const openCreate = () => {
    setEditingTask(null);
    setModalTitle(''); setModalPriority('MEDIUM');
    setModalRows([emptyRow()]); setModalError('');
    setShowModal(true);
  };

  const handleEdit = (task: ParentTask) => {
    setEditingTask(task);
    setModalTitle(task.title);
    setModalPriority(task.priority);
    setModalRows([emptyRow()]);
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingTask(null); setModalError(''); };

  const handleCreate = async () => {
    if (!modalTitle.trim()) { setModalError('Title is required'); return; }
    if (!workspaceId) { setModalError('No workspace found'); return; }
    setModalLoading(true); setModalError('');
    try {
      if (editingTask) {
        const r = await api.tasks.update(workspaceId, editingTask.id, { title: modalTitle.trim(), priority: modalPriority });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!r.success) { setModalError((r as any).error || 'Failed to update'); return; }
      } else {
        const r = await api.tasks.create(workspaceId, { title: modalTitle.trim(), priority: modalPriority, status: 'TODO' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!r.success) { setModalError((r as any).error || 'Failed to create'); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parentId = (r.data as any).task.id;
        const createdIds: Record<number, string> = {};
        for (let i = 0; i < modalRows.length; i++) {
          const row = modalRows[i];
          if (!row.title.trim()) continue;
          const dependsOnId = row.dependsOnIndex !== null ? (createdIds[row.dependsOnIndex] ?? null) : null;
          const note = row.notifyUserId
            ? `notify:${row.notifyUserId}|${row.note || ''}`
            : (row.note || null);
          const sr = await api.tasks.createSubtask(workspaceId, parentId, {
            title: row.title.trim(), note, dueDate: row.dueDate || null,
            assigneeId: row.assigneeId || null, dependsOnId,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (sr.success) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newId = (sr.data as any).subtask.id;
            createdIds[i] = newId;
            if (row.assigneeId && row.assigneeId !== currentUser?.id) {
              await createNotification({
                userId: row.assigneeId,
                workspaceId,
                type: 'task_assigned',
                title: 'New to-do assigned to you',
                body: `You were assigned: "${row.title.trim()}"`,
                triggeredById: currentUser?.id,
              });
            }
          }
        }
      }
      await fetchTasks(workspaceId);
      closeModal();
    } catch (err) {
      console.error(err);
      setModalError('Something went wrong');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentWorkspace) return;
    if (!window.confirm('Delete this task group and all its to-dos?')) return;
    await api.tasks.delete(currentWorkspace.id, taskId);
    await fetchTasks(currentWorkspace.id);
  };

  const handleSubtaskStatusChange = async (subtask: SubtaskItem, newStatus: Status) => {
    const workspaceId = currentWorkspace?.id;
    if (!workspaceId) return;

    if (newStatus === 'IN_PROGRESS') {
      setInProgressIds(prev => new Set([...prev, subtask.id]));
      if (subtask.done) {
        await api.tasks.updateSubtask(workspaceId, subtask.parentTask.id, subtask.id, { done: false });
        await fetchTasks(workspaceId);
      }
      return;
    }

    setInProgressIds(prev => { const n = new Set(prev); n.delete(subtask.id); return n; });

    if (newStatus === 'DONE' && !subtask.done) {
      const unlocked = subtask.parentTask.subtasks.find(st => st.dependsOnId === subtask.id && !st.done);
      if (unlocked) showToast(`🔓 "${unlocked.title}" is now unlocked!`);

      if (subtask.note?.startsWith('notify:')) {
        const afterPrefix = subtask.note.slice('notify:'.length);
        const notifyId    = afterPrefix.split('|')[0];
        const member      = workspaceMembers.find((m: Member) => m.id === notifyId);
        if (member) {
          showToast(`🔔 "${subtask.title}" is done! Notifying ${member.name}…`);
          createNotification({
            userId: notifyId,
            workspaceId,
            type: 'task_done',
            title: 'To-do completed ✓',
            body: `"${subtask.title}" has been completed`,
            triggeredById: user?.id,
          });
        }
      }
    }

    await api.tasks.updateSubtask(workspaceId, subtask.parentTask.id, subtask.id, { done: newStatus === 'DONE' });
    await fetchTasks(workspaceId);
  };

  const handleDeleteSubtask = async (subtask: SubtaskItem) => {
    const workspaceId = currentWorkspace?.id;
    if (!workspaceId) return;
    if (!window.confirm('Delete this to-do?')) return;
    await api.tasks.deleteSubtask(workspaceId, subtask.parentTask.id, subtask.id);
    await fetchTasks(workspaceId);
  };

  const handleRefresh = async () => {
    const workspaceId = currentWorkspace?.id;
    if (workspaceId) await fetchTasks(workspaceId);
  };

  const menuToggle = (id: string) => setOpenMenuId(prev => prev === id ? null : id);
  const menuClose  = () => setOpenMenuId(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const allSubtasks: SubtaskItem[] = tasks.flatMap(t =>
    t.subtasks.map(s => ({ ...s, parentTask: t }))
  );

  const applyFilter = (items: SubtaskItem[]): SubtaskItem[] => {
    let r = items;
    if (filter === 'mine') r = r.filter(s => user && s.assigneeId === user.id);
    if (filter === 'high') r = r.filter(s => s.parentTask.priority === 'HIGH');
    if (dateFilter !== 'all') {
      const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
      r = r.filter(s => {
        if (!s.dueDate) return false;
        const d = new Date(s.dueDate + 'T00:00:00');
        if (dateFilter === 'month') return d.getFullYear() === y && d.getMonth() === m;
        if (dateFilter === 'week') {
          const ws = new Date(now); ws.setDate(now.getDate() - now.getDay() + 1); ws.setHours(0,0,0,0);
          const we = new Date(ws);  we.setDate(ws.getDate() + 6);               we.setHours(23,59,59,999);
          return d >= ws && d <= we;
        }
        if (dateFilter === 'overdue') return d < new Date(new Date().setHours(0,0,0,0));
        return true;
      });
    }
    return r;
  };

  const filteredSubtasks = applyFilter(allSubtasks);
  const currentDateLabel = DATE_FILTERS.find(d => d.id === dateFilter)?.label ?? 'All Time';

  const columnItems: Record<Status, SubtaskItem[]> = {
    TODO:        filteredSubtasks.filter(s => getSubtaskStatus(s) === 'TODO'),
    IN_PROGRESS: filteredSubtasks.filter(s => getSubtaskStatus(s) === 'IN_PROGRESS'),
    DONE:        filteredSubtasks.filter(s => getSubtaskStatus(s) === 'DONE'),
  };

  const calendarItems = (() => {
    let r = allSubtasks;
    if (filter === 'mine') r = r.filter(s => user && s.assigneeId === user.id);
    if (filter === 'high') r = r.filter(s => s.parentTask.priority === 'HIGH');
    return r;
  })();

  const listGroups = (() => {
    const seen = new Map<string, { parent: ParentTask; items: SubtaskItem[] }>();
    for (const item of filteredSubtasks) {
      if (!seen.has(item.parentTask.id)) seen.set(item.parentTask.id, { parent: item.parentTask, items: [] });
      seen.get(item.parentTask.id)!.items.push(item);
    }
    return Array.from(seen.values());
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1080px] mx-auto px-10 pt-10 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Tasks
        </h1>
        <div className="flex items-center gap-3">
          {/* Date dropdown */}
          <div className="relative" ref={ddRef}>
            <button onClick={() => setDdOpen(o => !o)}
              className="flex items-center gap-1.5 px-[14px] py-1.5 rounded-full text-[12px] font-semibold border [transition:var(--transition)] cursor-pointer bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]">
              📅 {currentDateLabel}
              <span className="inline-block text-[10px] opacity-60"
                style={{ transform: ddOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▾</span>
            </button>
            {ddOpen && (
              <div className="absolute top-full left-0 mt-1 z-[20] bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden min-w-[140px]"
                style={{ boxShadow: 'var(--shadow-md)' }}>
                {DATE_FILTERS.map(df => (
                  <button key={df.id} onClick={() => { setDateFilter(df.id); setDdOpen(false); }}
                    className={clsx('w-full text-left px-4 py-2.5 text-[12px] font-medium [transition:var(--transition)] cursor-pointer',
                      dateFilter === df.id ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]')}>
                    {df.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={clsx('px-[14px] py-1.5 rounded-full text-[12px] font-semibold border [transition:var(--transition)] cursor-pointer',
                  filter === f.id ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]' : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]')}>
                {f.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-0.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-0.5">
            {VIEW_MODES.map(vm => (
              <button key={vm.id} onClick={() => setViewMode(vm.id)} title={vm.id}
                className={clsx('w-8 h-7 rounded-[6px] flex items-center justify-center text-[14px] [transition:var(--transition)] cursor-pointer',
                  viewMode === vm.id ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>
                {vm.icon}
              </button>
            ))}
          </div>

          <button onClick={openCreate}
            className="bg-[var(--accent)] text-white rounded-lg py-2 px-4 text-[13px] font-semibold cursor-pointer hover:opacity-90 [transition:var(--transition)]">
            ＋ New Task
          </button>
        </div>
      </div>

      {/* Task groups panel — shown above kanban and list */}
      {(viewMode === 'kanban' || viewMode === 'list') && (
        <ParentTasksPanel tasks={tasks} onEdit={handleEdit} onDelete={handleDeleteTask} />
      )}

      {/* ── Kanban ─────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map(col => {
            const colItems = columnItems[col.id];
            return (
              <div key={col.id} className="min-w-[300px] flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between py-[14px] px-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dotColor }} />
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">{col.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--border)] px-2 py-px rounded-[10px]">
                    {colItems.length}
                  </span>
                </div>

                <div className="p-2.5 min-h-[120px] flex flex-col gap-1.5">
                  {colItems.map(item => (
                    <SubtaskKanbanCard
                      key={item.id}
                      subtask={item}
                      parent={item.parentTask}
                      status={getSubtaskStatus(item)}
                      expanded={expandedSubtaskId === item.id}
                      onToggleExpand={() => setExpandedSubtaskId(p => p === item.id ? null : item.id)}
                      onStatusChange={s => handleSubtaskStatusChange(item, s)}
                      onDelete={() => handleDeleteSubtask(item)}
                      workspaceId={currentWorkspace?.id ?? ''}
                      onRefresh={handleRefresh}
                    />
                  ))}

                  {colItems.length === 0 && (
                    <p className="text-center text-[12px] text-[var(--text-muted)] py-6 italic">No to-dos here</p>
                  )}

                  <div onClick={openCreate}
                    className="border-[1.5px] border-dashed border-[var(--border)] rounded-lg p-2.5 text-center text-[13px] text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] [transition:var(--transition)] mt-1">
                    ＋ Add task group
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div>
          <div className="grid px-4 pb-2 mb-0.5" style={{ gridTemplateColumns: '1fr 160px 90px 140px 30px' }}>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">To-do</span>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Assignee</span>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Due</span>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</span>
            <span />
          </div>

          {listGroups.map(({ parent, items }) => (
            <div key={parent.id} className="mb-3">
              {/* Parent header */}
              <div style={{
                background: 'var(--bg)', padding: '9px 16px',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                border: '1px solid var(--border)', borderBottom: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...PRIORITY_CHIP_STYLE[parent.priority], padding: '2px 7px', fontSize: 10, fontWeight: 700, borderRadius: 20 }}>{parent.priority}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{parent.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{parent.subtasks.filter(s => s.done).length}/{parent.subtasks.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleEdit(parent)}
                    style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >✏ Edit</button>
                  <button
                    onClick={() => handleDeleteTask(parent.id)}
                    style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, background: 'var(--red-light)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--red)', fontFamily: 'var(--font-body)', transition: 'var(--transition)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >🗑</button>
                </div>
              </div>

              {/* Subtask rows */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}>
                {items.map((item, i) => {
                  const st     = getSubtaskStatus(item);
                  const locked = isLocked(item, parent.subtasks);
                  const due    = formatDueDate(item.dueDate);
                  return (
                    <div key={item.id}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 160px 90px 140px 30px',
                        alignItems: 'center', padding: '10px 16px',
                        borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border)',
                        transition: 'background var(--transition)',
                      }}
                      className="hover:bg-[var(--bg)]"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingRight: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: PRIORITY_DOT_COLOR[parent.priority] }} />
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: st === 'DONE' || locked ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: st === 'DONE' ? 'line-through' : 'none',
                          fontStyle: locked ? 'italic' : 'normal',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {locked && '🔒 '}{item.title}
                        </span>
                      </div>
                      <AssigneeAvatar assignee={item.assignee} size={20} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{due ? `📅 ${due}` : '—'}</span>
                      <select
                        value={st}
                        disabled={locked}
                        onChange={e => handleSubtaskStatusChange(item, e.target.value as Status)}
                        style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', outline: 'none' }}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                      {locked ? (
                        <span style={{ fontSize: 13, textAlign: 'center' }}>🔒</span>
                      ) : (
                        <button
                          onClick={() => handleSubtaskStatusChange(item, st === 'DONE' ? 'TODO' : 'DONE')}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', padding: 0, margin: '0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: st === 'DONE' ? 'var(--green)' : 'transparent',
                            border: st === 'DONE' ? 'none' : '1.5px solid var(--border-strong)',
                            cursor: 'pointer', flexShrink: 0,
                          }}>
                          {st === 'DONE' && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {listGroups.length === 0 && (
            <div className="text-center py-16 text-[13px] text-[var(--text-muted)]">No tasks match the current filters.</div>
          )}
        </div>
      )}

      {/* ── Calendar ───────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <CalendarView
          items={calendarItems}
          getSubtaskStatus={getSubtaskStatus}
          openMenuId={openMenuId}
          onMenuToggle={menuToggle}
          onMenuClose={menuClose}
          onEdit={handleEdit}
          onDelete={handleDeleteTask}
          onStatusChange={handleSubtaskStatusChange}
        />
      )}

      <Toast message={toastMsg} visible={toastVisible} />

      {showModal && (
        <NewTaskModal
          isEditing={!!editingTask}
          title={modalTitle}        onTitleChange={setModalTitle}
          priority={modalPriority}  onPriorityChange={setModalPriority}
          rows={modalRows}          onRowsChange={setModalRows}
          loading={modalLoading}    error={modalError}
          onSubmit={handleCreate}   onClose={closeModal}
        />
      )}
    </div>
  );
}
