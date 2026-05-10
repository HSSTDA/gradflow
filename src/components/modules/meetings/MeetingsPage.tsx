'use client';

import { useState } from 'react';
import { useMeetingsStore } from '@/store/meetingsStore';
import { useAuthStore } from '@/store/authStore';

// ─── MeetingsPage ─────────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const { meetings, toggleAction } = useMeetingsStore();
  const { currentWorkspace } = useAuthStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

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
          style={{
            background:   'var(--accent)',
            color:        'white',
            border:       'none',
            borderRadius: 'var(--radius-sm)',
            padding:      '9px 16px',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            flexShrink:   0,
            transition:   'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          + New Meeting
        </button>
      </div>

      {/* ── Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {meetings.map(meeting => {
          const isOpen   = expandedId === meeting.id;
          const isSupv   = meeting.type === 'SUPERVISOR';

          return (
            <div
              key={meeting.id}
              onClick={() => toggle(meeting.id)}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow:    'var(--shadow-sm)',
                overflow:     'hidden',
                cursor:       'pointer',
                transition:   'box-shadow var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* ── Card Header ── */}
              <div style={{
                padding:        '16px 20px',
                borderBottom:   '1px solid var(--border)',
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                gap:            12,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {meeting.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                    📅 {meeting.date} &nbsp;·&nbsp; {meeting.time}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/* Attendee avatars */}
                  <div style={{ display: 'flex' }}>
                    {meeting.attendees.map((a, i) => {
                      const initials = a.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div
                          key={a.user.id}
                          title={a.user.name}
                          style={{
                            width:          24,
                            height:         24,
                            borderRadius:   '50%',
                            background:     '#888',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontSize:       9,
                            fontWeight:     700,
                            color:          'white',
                            border:         '2px solid var(--surface)',
                            marginLeft:     i === 0 ? 0 : -6,
                            position:       'relative',
                            zIndex:         meeting.attendees.length - i,
                          }}
                        >
                          {initials}
                        </div>
                      );
                    })}
                  </div>

                  {/* Type tag */}
                  <span style={{
                    fontSize:     11,
                    fontWeight:   600,
                    padding:      '3px 9px',
                    borderRadius: 20,
                    background:   isSupv ? 'var(--accent-light)' : 'var(--blue-light)',
                    color:        isSupv ? 'var(--accent)'       : 'var(--blue)',
                    whiteSpace:   'nowrap',
                  }}>
                    {meeting.type}
                  </span>

                  {/* Chevron */}
                  <span style={{
                    fontSize:    13,
                    color:       'var(--text-muted)',
                    display:     'inline-block',
                    transform:   isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition:  'transform var(--transition)',
                    lineHeight:  1,
                    userSelect:  'none',
                  }}>
                    ↓
                  </span>
                </div>
              </div>

              {/* ── Card Body — expandable ── */}
              <div style={{
                maxHeight:  isOpen ? 600 : 0,
                overflow:   'hidden',
                transition: 'max-height 0.3s ease',
              }}>
                <div style={{
                  padding:             '18px 20px',
                  display:             'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap:                 24,
                }}>

                  {/* Notes */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Meeting Notes
                    </div>
                    {meeting.notes.map((note, i) => (
                      <div
                        key={i}
                        style={{
                          padding:      '6px 0',
                          borderBottom: i < meeting.notes.length - 1 ? '1px solid var(--border)' : 'none',
                          display:      'flex',
                          gap:          8,
                          alignItems:   'flex-start',
                        }}
                      >
                        <span style={{ color: 'var(--accent)', fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{note.content}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Items */}
                  <div onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Action Items
                    </div>
                    {meeting.actionItems.map((action, i) => (
                      <div
                        key={action.id}
                        style={{
                          padding:      '6px 0',
                          borderBottom: i < meeting.actionItems.length - 1 ? '1px solid var(--border)' : 'none',
                          display:      'flex',
                          alignItems:   'center',
                          gap:          8,
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          onClick={() => currentWorkspace && toggleAction(currentWorkspace.id, meeting.id, action.id)}
                          style={{
                            width:          16,
                            height:         16,
                            borderRadius:   '50%',
                            border:         action.done ? 'none' : '2px solid var(--border-strong)',
                            background:     action.done ? 'var(--green)' : 'transparent',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            flexShrink:     0,
                            cursor:         'pointer',
                          }}
                        >
                          {action.done && (
                            <span style={{ color: 'white', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>
                          )}
                        </div>

                        {/* Text */}
                        <span style={{
                          fontSize:       13,
                          color:          action.done ? 'var(--text-muted)' : 'var(--text-secondary)',
                          textDecoration: action.done ? 'line-through'      : 'none',
                          flex:           1,
                          lineHeight:     1.4,
                        }}>
                          {action.text}
                        </span>

                        {/* Assignee avatar */}
                        {action.assignee && (
                          <div style={{
                            width:          20,
                            height:         20,
                            borderRadius:   '50%',
                            background:     '#888',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontSize:       8,
                            fontWeight:     700,
                            color:          'white',
                            flexShrink:     0,
                          }}>
                            {action.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* ── Card Footer ── */}
              <div
                style={{
                  padding:        '10px 20px',
                  borderTop:      '1px solid var(--border)',
                  background:     'var(--bg)',
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                }}
                onClick={e => e.stopPropagation()}
              >
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  🕐 Duration: {meeting.duration} min
                </span>
                <button
                  style={{
                    fontSize:   11,
                    fontWeight: 600,
                    color:      'var(--accent)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    padding:    0,
                  }}
                >
                  View Full Notes →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
