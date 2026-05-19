'use client';

import { useState, useEffect } from 'react';
import { useMeetingsStore } from '@/store/meetingsStore';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { createNotification } from '@/lib/notify';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PALETTE = ['#D4500A', '#2563EB', '#16A34A', '#7C3AED', '#D97706', '#0891B2'];
function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function getInitials(name: string): string {
  return (name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  TEAM_SYNC:     { bg: 'var(--blue-light)',  color: 'var(--blue)',   label: 'Team Sync'     },
  SUPERVISOR:    { bg: 'var(--accent-light)', color: 'var(--accent)', label: 'Supervisor'    },
  DESIGN_REVIEW: { bg: '#F3E8FF',            color: '#7C3AED',       label: 'Design Review' },
  REVIEW:        { bg: 'var(--green-light)',  color: 'var(--green)',  label: 'Review'        },
  OTHER:         { bg: 'var(--bg)',           color: 'var(--text-secondary)', label: 'Other' },
};

const GHOST_BTN: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)',
  border: '1px solid var(--border)', padding: '4px 10px',
  borderRadius: 6, background: 'transparent',
  cursor: 'pointer', transition: 'var(--transition)', fontFamily: 'var(--font-body)',
};

// ─── MeetingModal ─────────────────────────────────────────────────────────────
function MeetingModal({
  members,
  editingMeeting,
  onClose,
  onSubmit,
}: {
  members: any[];
  editingMeeting: any | null;
  onClose: () => void;
  onSubmit: (data: object) => Promise<void>;
}) {
  const isEdit = editingMeeting !== null;

  const [title,     setTitle]     = useState(editingMeeting?.title ?? '');
  const [date,      setDate]      = useState(
    editingMeeting ? new Date(editingMeeting.date).toISOString().split('T')[0] : ''
  );
  const [time,      setTime]      = useState(
    editingMeeting
      ? new Date(editingMeeting.date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : '09:00'
  );
  const [duration,  setDuration]  = useState(editingMeeting?.duration?.toString() ?? '60');
  const [type,      setType]      = useState(editingMeeting?.type ?? 'TEAM_SYNC');
  const [attendees, setAttendees] = useState<string[]>(
    editingMeeting ? editingMeeting.attendees.map((a: any) => a.user.id) : []
  );
  const [notes,     setNotes]     = useState<string[]>(
    editingMeeting?.notes.length > 0
      ? editingMeeting.notes.map((n: any) => n.content)
      : ['']
  );
  const [actions,   setActions]   = useState<{ text: string; assigneeId: string }[]>(
    editingMeeting?.actionItems.length > 0
      ? editingMeeting.actionItems.map((a: any) => ({ text: a.text, assigneeId: a.assigneeId || '' }))
      : [{ text: '', assigneeId: '' }]
  );
  const [saving,    setSaving]    = useState(false);

  const toggleAttendee = (id: string) =>
    setAttendees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    const dateTime = new Date(`${date}T${time || '09:00'}`);
    await onSubmit({
      title: title.trim(),
      date: dateTime.toISOString(),
      duration: parseInt(duration),
      type,
      attendeeIds: attendees,
      notes: notes.filter(n => n.trim()),
      actionItems: actions.filter(a => a.text.trim()).map(a => ({
        text: a.text.trim(),
        assigneeId: a.assigneeId || null,
      })),
    });
    setSaving(false);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'border-color var(--transition)',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(620px, 92vw)', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', padding: 28,
          display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Meeting' : 'New Meeting'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '2px 6px', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Title */}
        <Field label="Title *">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title…" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border)'; }} />
        </Field>

        {/* Date + Time row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date *">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)'; }} />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)'; }} />
          </Field>
        </div>

        {/* Duration + Type row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Duration">
            <select value={duration} onChange={e => setDuration(e.target.value)} style={inputStyle}>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
            </select>
          </Field>
          <Field label="Type">
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              <option value="TEAM_SYNC">Team Sync</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="REVIEW">Review</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </div>

        {/* Attendees */}
        <Field label="Attendees">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {members.map(m => {
              const selected = attendees.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 100, cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
                    background: selected ? 'var(--accent-light)' : 'var(--bg)',
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'var(--transition)',
                  }}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Notes */}
        <Field label={isEdit ? 'Meeting Notes (add new)' : 'Meeting Notes'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notes.map((note, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={note}
                  onChange={e => setNotes(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                  placeholder={`Note ${i + 1}…`}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)'; }}
                />
                <button onClick={() => setNotes(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '4px 6px', flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={() => setNotes(prev => [...prev, ''])}
              style={{ ...GHOST_BTN, alignSelf: 'flex-start', marginTop: 2 }}>
              + Add note
            </button>
          </div>
        </Field>

        {/* Action Items */}
        <Field label={isEdit ? 'Action Items (add new)' : 'Action Items'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.map((action, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={action.text}
                  onChange={e => setActions(prev => prev.map((a, j) => j === i ? { ...a, text: e.target.value } : a))}
                  placeholder="Action item…"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)'; }}
                />
                <select
                  value={action.assigneeId}
                  onChange={e => setActions(prev => prev.map((a, j) => j === i ? { ...a, assigneeId: e.target.value } : a))}
                  style={{ ...inputStyle, width: 130, flex: 'none' }}
                >
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                </select>
                <button onClick={() => setActions(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '4px 6px', flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={() => setActions(prev => [...prev, { text: '', assigneeId: '' }])}
              style={{ ...GHOST_BTN, alignSelf: 'flex-start', marginTop: 2 }}>
              + Add action
            </button>
          </div>
        </Field>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !date}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              cursor: saving || !title.trim() || !date ? 'not-allowed' : 'pointer',
              border: 'none', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)', color: 'white',
              opacity: saving || !title.trim() || !date ? 0.5 : 1,
              fontFamily: 'var(--font-body)', transition: 'opacity var(--transition)',
            }}
          >
            {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Meeting')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

// ─── MeetingsPage ─────────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const workspaceId = useAuthStore(s => s.currentWorkspace?.id);
  const currentUser = useAuthStore(s => s.user);
  const { meetings, isLoading, fetchMeetings, createMeeting, updateMeeting, toggleAction, deleteMeeting } = useMeetingsStore();
  const [members,        setMembers]        = useState<any[]>([]);
  const [showModal,      setShowModal]      = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any | null>(null);
  const [expandedId,     setExpandedId]     = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    fetchMeetings(workspaceId);
    api.workspaces.members(workspaceId).then(res => {
      if (res.success) setMembers((res.data as any).members ?? []);
    });
  }, [workspaceId]);

  const handleClose = () => {
    setEditingMeeting(null);
    setShowModal(false);
  };

  const handleEdit = (e: React.MouseEvent, meeting: any) => {
    e.stopPropagation();
    setEditingMeeting(meeting);
    setShowModal(true);
  };

  const handleSubmit = async (data: any) => {
    if (!workspaceId) return;

    if (editingMeeting) {
      await updateMeeting(workspaceId, editingMeeting.id, {
        title: data.title,
        date: data.date,
        duration: data.duration,
        type: data.type,
      });

      const originalNoteContents = editingMeeting.notes.map((n: any) => n.content);
      const newNotes = (data.notes as string[]).filter(n => !originalNoteContents.includes(n));
      for (const text of newNotes) {
        await api.meetings.addNote(workspaceId, editingMeeting.id, { text });
      }

      const originalActionTexts = editingMeeting.actionItems.map((a: any) => a.text);
      const newActions = (data.actionItems as any[]).filter(a => !originalActionTexts.includes(a.text));
      for (const action of newActions) {
        await api.meetings.addAction(workspaceId, editingMeeting.id, {
          text: action.text,
          assigneeId: action.assigneeId || null,
        });
      }

      await fetchMeetings(workspaceId);
    } else {
      await createMeeting(workspaceId, data);
      // Notify each attendee except the creator
      const attendeeIds: string[] = (data as any).attendeeIds ?? [];
      const dateLabel = new Date((data as any).date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      for (const attendeeId of attendeeIds) {
        if (attendeeId !== currentUser?.id) {
          createNotification({
            userId: attendeeId,
            workspaceId,
            type: 'meeting',
            title: 'New meeting scheduled',
            body: `${(data as any).title} — ${dateLabel}`,
            triggeredById: currentUser?.id,
          });
        }
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    if (!workspaceId) return;
    if (!window.confirm('Delete this meeting?')) return;
    await deleteMeeting(workspaceId, meetingId);
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 80px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            Meetings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Notes, decisions &amp; action items
          </p>
        </div>
        <button
          onClick={() => { setEditingMeeting(null); setShowModal(true); }}
          style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            flexShrink: 0, transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          + New Meeting
        </button>
      </div>

      {/* ── Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading && <SkeletonLoader rows={3} height={80} />}

        {!isLoading && meetings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            No meetings yet.
          </div>
        )}

        {meetings.map(meeting => {
          const isOpen  = expandedId === meeting.id;
          const ts      = TYPE_STYLE[meeting.type] ?? TYPE_STYLE.OTHER;

          return (
            <div
              key={meeting.id}
              onClick={() => setExpandedId(prev => prev === meeting.id ? null : meeting.id)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden', cursor: 'pointer',
                transition: 'box-shadow var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Card Header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {meeting.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    📅 {formatDate(meeting.date)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/* Attendee avatars */}
                  <div style={{ display: 'flex' }}>
                    {meeting.attendees.map((a: any, i: number) => {
                      const name = a.user?.name ?? '';
                      return (
                        <div
                          key={a.user?.id ?? i}
                          title={name}
                          style={{
                            width: 24, height: 24, borderRadius: '50%', background: hashColor(a.user?.id ?? String(i)),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700, color: 'white',
                            border: '2px solid var(--surface)',
                            marginLeft: i === 0 ? 0 : -6,
                            position: 'relative', zIndex: meeting.attendees.length - i,
                          }}
                        >
                          {getInitials(name)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Type tag */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                    background: ts.bg, color: ts.color, whiteSpace: 'nowrap',
                  }}>
                    {ts.label}
                  </span>

                  {/* Edit */}
                  <button
                    onClick={e => handleEdit(e, meeting)}
                    title="Edit meeting"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1,
                      transition: 'color var(--transition)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--blue)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    ✏️
                  </button>

                  {/* Delete */}
                  <button
                    onClick={e => handleDelete(e, meeting.id)}
                    title="Delete meeting"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1,
                      transition: 'color var(--transition)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    🗑
                  </button>

                  {/* Chevron */}
                  <span style={{
                    fontSize: 13, color: 'var(--text-muted)',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform var(--transition)',
                    lineHeight: 1, userSelect: 'none',
                  }}>
                    ↓
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ maxHeight: isOpen ? 600 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                  {/* Notes */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Meeting Notes
                    </div>
                    {meeting.notes.length === 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes recorded.</span>
                    )}
                    {meeting.notes.map((note: any, i: number) => (
                      <div key={note.id ?? i} style={{
                        padding: '6px 0',
                        borderBottom: i < meeting.notes.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                      }}>
                        <span style={{ color: 'var(--accent)', fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {note.content}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Items */}
                  <div onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Action Items
                    </div>
                    {meeting.actionItems.length === 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No action items.</span>
                    )}
                    {meeting.actionItems.map((action: any, i: number) => (
                      <div key={action.id} style={{
                        padding: '6px 0',
                        borderBottom: i < meeting.actionItems.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <div
                          onClick={() => workspaceId && toggleAction(workspaceId, meeting.id, action.id)}
                          style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                            border: action.done ? 'none' : '2px solid var(--border-strong)',
                            background: action.done ? 'var(--green)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {action.done && <span style={{ color: 'white', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{
                          fontSize: 13, flex: 1, lineHeight: 1.4,
                          color: action.done ? 'var(--text-muted)' : 'var(--text-secondary)',
                          textDecoration: action.done ? 'line-through' : 'none',
                        }}>
                          {action.text}
                        </span>
                        {action.assignee && (
                          <div
                            title={action.assignee.name}
                            style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              background: hashColor(action.assignee.id ?? action.assigneeId ?? ''),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 8, fontWeight: 700, color: 'white',
                            }}
                          >
                            {getInitials(action.assignee.name)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div
                style={{
                  padding: '10px 20px', borderTop: '1px solid var(--border)',
                  background: 'var(--bg)', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                }}
                onClick={e => e.stopPropagation()}
              >
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  🕐 {meeting.duration} min
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {meeting.actionItems.filter((a: any) => a.done).length}/{meeting.actionItems.length} actions done
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <MeetingModal
          members={members}
          editingMeeting={editingMeeting}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
