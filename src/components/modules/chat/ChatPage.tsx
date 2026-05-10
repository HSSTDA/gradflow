'use client';

import { useState, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'team' | 'mentions' | 'dm';

interface Message {
  id:     number;
  sender: string;
  text:   string;
  time:   string;
  self:   boolean;
}

interface DMMessage {
  sender: string;
  text:   string;
  time:   string;
  self:   boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MEMBER_MAP: Record<string, { name: string; color: string; online: boolean }> = {
  SA: { name: 'Sara Ahmed',  color: '#D4500A', online: true  },
  OK: { name: 'Omar Khalil', color: '#2563EB', online: true  },
  LH: { name: 'Lina Hassan', color: '#16A34A', online: true  },
  AN: { name: 'Ahmed Nour',  color: '#7C3AED', online: false },
  NS: { name: 'Nora Salem',  color: '#D97706', online: true  },
};

const MEMBER_IDS = ['SA', 'OK', 'LH', 'AN', 'NS'];

const INIT_MESSAGES: Message[] = [
  { id:1, sender:'LH',   self:false, time:'10:22 AM', text:'Hey team! Just uploaded the new wireframes to Files. Can everyone review before the meeting?'  },
  { id:2, sender:'OK',   self:false, time:'10:31 AM', text:'On it! The login flow looks great btw 👏'                                                        },
  { id:3, sender:'SA',   self:false, time:'10:45 AM', text:'@Omar can you start on the auth API after reviewing?'                                            },
  { id:4, sender:'self', self:true,  time:'10:47 AM', text:'Yes, already started. Should be done by Thursday.'                                               },
  { id:5, sender:'AN',   self:false, time:'11:15 AM', text:'Also updated the literature review in the docs. Let me know if you need citations.'               },
  { id:6, sender:'SA',   self:false, time:'11:30 AM', text:"Let's sync tomorrow at 10am before the supervisor meeting 📅"                                     },
  { id:7, sender:'NS',   self:false, time:'11:45 AM', text:'@Sara I finished the DB migration scripts, pushed to GitHub ✅'                                   },
  { id:8, sender:'self', self:true,  time:'11:50 AM', text:'Nice work everyone. See you all tomorrow 👋'                                                       },
];

const MENTIONS = [
  { id:'m1', sender:'SA', time:'10:45 AM',          text:'@Omar can you start on the auth API after reviewing?'              },
  { id:'m2', sender:'NS', time:'Yesterday 3:20 PM', text:'@Omar pushed auth changes, please review before merge'             },
  { id:'m3', sender:'SA', time:'May 6 9:15 AM',     text:'@Omar the supervisor wants the activity log added this week'       },
];

const DM_MEMBERS = ['SA', 'LH', 'AN', 'NS'];
const DM_UNREAD: Record<string, boolean> = { SA: true };

const INIT_DM: Record<string, DMMessage[]> = {
  SA: [
    { sender:'SA',   self:false, time:'9:15 AM',  text:'Hey, did you push the auth changes to GitHub?'                                         },
    { sender:'self', self:true,  time:'9:18 AM',  text:'Not yet, finishing up the JWT refresh logic. Will push by noon.'                        },
    { sender:'SA',   self:false, time:'9:20 AM',  text:'Perfect. The supervisor meeting is at 2pm so we need it ready before that 🙏'           },
    { sender:'self', self:true,  time:'11:52 AM', text:'Done ✅ just pushed. Branch is auth/jwt-refresh'                                        },
    { sender:'SA',   self:false, time:'11:55 AM', text:'Amazing! Merging now 🚀'                                                                },
  ],
  LH: [],
  AN: [],
  NS: [],
};

const PINNED_ITEMS = [
  'Meeting tomorrow at 10am — review wireframes before supervisor call',
  'Final deadline: June 20 — deployment required before June 18',
];

const MENTION_NAMES = ['@Sara', '@Omar', '@Lina', '@Ahmed', '@Nora'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMentions(text: string): React.ReactNode[] {
  const segments = text.split(/(@(?:Sara|Omar|Lina|Ahmed|Nora))/g);
  return segments.map((seg, i) =>
    MENTION_NAMES.includes(seg) ? (
      <span key={i} style={{
        background:   'var(--accent-light)',
        color:        'var(--accent)',
        borderRadius: 4,
        padding:      '1px 5px',
        fontWeight:   600,
        fontSize:     13,
      }}>
        {seg}
      </span>
    ) : seg
  );
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [activeTab,     setActiveTab]     = useState<Tab>('team');
  const [messages,      setMessages]      = useState(INIT_MESSAGES);
  const [teamInput,     setTeamInput]     = useState('');
  const [hoveredBubble, setHoveredBubble] = useState<number | null>(null);
  const [activeDM,      setActiveDM]      = useState('SA');
  const [dmMessages,    setDmMessages]    = useState(INIT_DM);
  const [dmInput,       setDmInput]       = useState('');

  const teamEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { teamEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeDM, dmMessages]);

  function sendTeam() {
    if (!teamInput.trim()) return;
    setMessages(prev => [...prev, {
      id:     Date.now(),
      sender: 'self',
      self:   true,
      time:   new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      text:   teamInput.trim(),
    }]);
    setTeamInput('');
  }

  function sendDM() {
    if (!dmInput.trim()) return;
    setDmMessages(prev => ({
      ...prev,
      [activeDM]: [...(prev[activeDM] ?? []), {
        sender: 'self',
        self:   true,
        time:   new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        text:   dmInput.trim(),
      }],
    }));
    setDmInput('');
  }

  // Group consecutive same-sender messages
  type Group = { sender: string; self: boolean; msgs: Message[] };
  const teamGroups: Group[] = [];
  for (const msg of messages) {
    const last = teamGroups[teamGroups.length - 1];
    if (last && last.sender === msg.sender) last.msgs.push(msg);
    else teamGroups.push({ sender: msg.sender, self: msg.self, msgs: [msg] });
  }

  const onlineIds = MEMBER_IDS.filter(id => MEMBER_MAP[id].online);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        height:         52,
        flexShrink:     0,
        background:     'var(--surface)',
        borderBottom:   '1px solid var(--border)',
        padding:        '0 28px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          {(['team', 'mentions', 'dm'] as Tab[]).map(tab => {
            const label    = tab === 'team' ? 'Team Chat' : tab === 'mentions' ? 'Mentions' : 'Direct Messages';
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding:      '6px 0',
                  marginRight:  28,
                  fontSize:     13,
                  fontWeight:   600,
                  color:        isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  background:   'none',
                  border:       'none',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                  transition:   'var(--transition)',
                }}
              >
                {label}
                {tab === 'mentions' && !isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Online avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {onlineIds.map((id, i) => (
              <div
                key={id}
                title={MEMBER_MAP[id].name}
                style={{
                  width:          24,
                  height:         24,
                  borderRadius:   '50%',
                  background:     MEMBER_MAP[id].color,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       8,
                  fontWeight:     700,
                  color:          'white',
                  border:         '2px solid var(--surface)',
                  marginLeft:     i === 0 ? 0 : -6,
                  position:       'relative',
                  zIndex:         onlineIds.length - i,
                }}
              >
                {id}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
            {onlineIds.length} online
          </span>
        </div>
      </div>

      {/* ── TAB 1: Team Chat ── */}
      {activeTab === 'team' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Messages column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* Date divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {teamGroups.map((group, gi) => {
                const member = MEMBER_MAP[group.sender];
                return (
                  <div
                    key={gi}
                    style={{
                      display:       'flex',
                      gap:           12,
                      marginTop:     gi > 0 ? 16 : 0,
                      flexDirection: group.self ? 'row-reverse' : 'row',
                    }}
                  >
                    {/* Avatar or spacer */}
                    {group.self ? (
                      <div style={{ width: 32, flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width:          32,
                        height:         32,
                        borderRadius:   '50%',
                        background:     member?.color ?? '#888',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        fontSize:       11,
                        fontWeight:     700,
                        color:          'white',
                        flexShrink:     0,
                        alignSelf:      'flex-start',
                      }}>
                        {group.sender}
                      </div>
                    )}

                    {/* Bubbles column */}
                    <div style={{
                      display:       'flex',
                      flexDirection: 'column',
                      gap:           3,
                      alignItems:    group.self ? 'flex-end' : 'flex-start',
                      maxWidth:      640,
                    }}>
                      {/* Header — first message only */}
                      {!group.self && member && (
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{member.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{group.msgs[0].time}</span>
                        </div>
                      )}

                      {group.msgs.map(msg => (
                        <div
                          key={msg.id}
                          style={{ position: 'relative' }}
                          onMouseEnter={() => setHoveredBubble(msg.id)}
                          onMouseLeave={() => setHoveredBubble(null)}
                        >
                          {/* Reaction bar */}
                          {hoveredBubble === msg.id && (
                            <div style={{
                              position:     'absolute',
                              top:          -32,
                              left:         msg.self ? 'auto' : 0,
                              right:        msg.self ? 0 : 'auto',
                              zIndex:       5,
                              background:   'var(--surface)',
                              border:       '1px solid var(--border)',
                              borderRadius: 20,
                              padding:      '3px 8px',
                              display:      'flex',
                              gap:          6,
                              fontSize:     14,
                              cursor:       'pointer',
                              whiteSpace:   'nowrap',
                              boxShadow:    'var(--shadow-sm)',
                            }}>
                              <span>👍</span><span>❤️</span><span>😂</span>
                            </div>
                          )}

                          <div style={{
                            background:   msg.self ? 'var(--accent)' : 'var(--surface)',
                            color:        msg.self ? 'white' : 'var(--text-primary)',
                            border:       msg.self ? 'none' : '1px solid var(--border)',
                            borderRadius: msg.self ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                            padding:      '10px 14px',
                            fontSize:     13.5,
                            lineHeight:   1.6,
                            maxWidth:     640,
                            display:      'inline-block',
                          }}>
                            {parseMentions(msg.text)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div ref={teamEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{
                background:   'var(--bg)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding:      '10px 14px',
                display:      'flex',
                gap:          10,
                alignItems:   'center',
              }}>
                <span style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer' }}>📎</span>
                <textarea
                  value={teamInput}
                  onChange={e => setTeamInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTeam(); } }}
                  placeholder="Message the team… use @ to mention"
                  rows={1}
                  style={{
                    flex:       1,
                    border:     'none',
                    background: 'none',
                    fontSize:   14,
                    fontFamily: 'var(--font-body)',
                    resize:     'none',
                    outline:    'none',
                    maxHeight:  100,
                    color:      'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                />
                <button
                  style={{
                    fontSize:     14,
                    fontWeight:   700,
                    color:        'var(--text-muted)',
                    border:       '1px solid var(--border)',
                    borderRadius: 6,
                    padding:      '4px 8px',
                    background:   'transparent',
                    cursor:       'pointer',
                    transition:   'var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  @
                </button>
                <button
                  onClick={sendTeam}
                  style={{
                    background:   'var(--accent)',
                    color:        'white',
                    border:       'none',
                    borderRadius: 8,
                    padding:      '6px 14px',
                    fontSize:     13,
                    fontWeight:   600,
                    cursor:       'pointer',
                    transition:   'var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#C04808'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{
            width:      200,
            flexShrink: 0,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            padding:    16,
            overflowY:  'auto',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              Team
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MEMBER_IDS.map(id => {
                const m = MEMBER_MAP[id];
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width:          26,
                      height:         26,
                      borderRadius:   '50%',
                      background:     m.color,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       9,
                      fontWeight:     700,
                      color:          'white',
                      flexShrink:     0,
                    }}>
                      {id}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                      {m.name.split(' ')[0]}
                    </span>
                    <div style={{
                      width:        7,
                      height:       7,
                      borderRadius: '50%',
                      background:   m.online ? 'var(--green)' : '#D1CDC8',
                      flexShrink:   0,
                    }} />
                  </div>
                );
              })}
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              Pinned
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PINNED_ITEMS.map((text, i) => (
                <div key={i} style={{
                  padding:    '8px 10px',
                  background: 'var(--bg)',
                  borderRadius: 6,
                  cursor:     'pointer',
                  borderLeft: '3px solid var(--accent)',
                  display:    'flex',
                  gap:        6,
                  transition: 'var(--transition)',
                }}>
                  <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>📌</span>
                  <span style={{
                    fontSize:        11,
                    color:           'var(--text-muted)',
                    lineHeight:      1.4,
                    display:         '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow:        'hidden',
                  }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Mentions ── */}
      {activeTab === 'mentions' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {MENTIONS.map(m => {
            const member = MEMBER_MAP[m.sender];
            return (
              <div key={m.id} style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding:      '14px 18px',
                marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width:          28,
                    height:         28,
                    borderRadius:   '50%',
                    background:     member?.color ?? '#888',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       10,
                    fontWeight:     700,
                    color:          'white',
                    flexShrink:     0,
                  }}>
                    {m.sender}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {member?.name ?? m.sender}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{m.time}</span>
                </div>

                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {parseMentions(m.text)}
                </p>

                <button
                  style={{
                    fontSize:   11,
                    color:      'var(--text-muted)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    padding:    0,
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  Reply ↩
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 3: Direct Messages ── */}
      {activeTab === 'dm' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* DM member list */}
          <div style={{
            width:         200,
            flexShrink:    0,
            borderRight:   '1px solid var(--border)',
            background:    'var(--surface)',
            display:       'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              fontSize:     12,
              fontWeight:   700,
              color:        'var(--text-primary)',
              padding:      '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              Direct Messages
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {DM_MEMBERS.map(id => {
                const m        = MEMBER_MAP[id];
                const isActive = activeDM === id;
                return (
                  <div
                    key={id}
                    onClick={() => setActiveDM(id)}
                    style={{
                      padding:    '9px 16px',
                      cursor:     'pointer',
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                      display:    'flex',
                      alignItems: 'center',
                      gap:        9,
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width:          28,
                      height:         28,
                      borderRadius:   '50%',
                      background:     m.color,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       10,
                      fontWeight:     700,
                      color:          'white',
                      flexShrink:     0,
                    }}>
                      {id}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                      {m.name.split(' ')[0]}
                    </span>
                    {DM_UNREAD[id] && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DM conversation */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(() => {
                const msgs = dmMessages[activeDM] ?? [];
                if (msgs.length === 0) {
                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ fontSize: 28 }}>💬</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Start a conversation with {MEMBER_MAP[activeDM]?.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                }

                type DMGroup = { sender: string; self: boolean; msgs: DMMessage[] };
                const dmGroups: DMGroup[] = [];
                for (const msg of msgs) {
                  const last = dmGroups[dmGroups.length - 1];
                  if (last && last.sender === msg.sender) last.msgs.push(msg);
                  else dmGroups.push({ sender: msg.sender, self: msg.self, msgs: [msg] });
                }

                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    {dmGroups.map((group, gi) => {
                      const member = MEMBER_MAP[group.sender];
                      return (
                        <div
                          key={gi}
                          style={{
                            display:       'flex',
                            gap:           12,
                            marginTop:     gi > 0 ? 16 : 0,
                            flexDirection: group.self ? 'row-reverse' : 'row',
                          }}
                        >
                          {group.self ? (
                            <div style={{ width: 32, flexShrink: 0 }} />
                          ) : (
                            <div style={{
                              width:          32,
                              height:         32,
                              borderRadius:   '50%',
                              background:     member?.color ?? '#888',
                              display:        'flex',
                              alignItems:     'center',
                              justifyContent: 'center',
                              fontSize:       11,
                              fontWeight:     700,
                              color:          'white',
                              flexShrink:     0,
                              alignSelf:      'flex-start',
                            }}>
                              {group.sender}
                            </div>
                          )}

                          <div style={{
                            display:       'flex',
                            flexDirection: 'column',
                            gap:           3,
                            alignItems:    group.self ? 'flex-end' : 'flex-start',
                            maxWidth:      520,
                          }}>
                            {!group.self && member && (
                              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{member.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{group.msgs[0].time}</span>
                              </div>
                            )}
                            {group.msgs.map((msg, mi) => (
                              <div key={mi} style={{
                                background:   msg.self ? 'var(--accent)' : 'var(--surface)',
                                color:        msg.self ? 'white' : 'var(--text-primary)',
                                border:       msg.self ? 'none' : '1px solid var(--border)',
                                borderRadius: msg.self ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                                padding:      '10px 14px',
                                fontSize:     13.5,
                                lineHeight:   1.6,
                                maxWidth:     520,
                                display:      'inline-block',
                              }}>
                                {msg.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={dmEndRef} />
                  </>
                );
              })()}
            </div>

            {/* DM input */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{
                background:   'var(--bg)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding:      '10px 14px',
                display:      'flex',
                gap:          10,
                alignItems:   'center',
              }}>
                <textarea
                  value={dmInput}
                  onChange={e => setDmInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); } }}
                  placeholder={`Message ${MEMBER_MAP[activeDM]?.name.split(' ')[0] ?? ''}…`}
                  rows={1}
                  style={{
                    flex:       1,
                    border:     'none',
                    background: 'none',
                    fontSize:   14,
                    fontFamily: 'var(--font-body)',
                    resize:     'none',
                    outline:    'none',
                    maxHeight:  100,
                    color:      'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={sendDM}
                  style={{
                    background:   'var(--accent)',
                    color:        'white',
                    border:       'none',
                    borderRadius: 8,
                    padding:      '6px 14px',
                    fontSize:     13,
                    fontWeight:   600,
                    cursor:       'pointer',
                    transition:   'var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#C04808'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
