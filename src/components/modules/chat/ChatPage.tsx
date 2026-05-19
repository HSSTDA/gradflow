'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { createNotification } from '@/lib/notify';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'team' | 'mentions' | 'dm';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PALETTE = ['#D4500A', '#2563EB', '#16A34A', '#7C3AED', '#D97706', '#0891B2', '#DC2626'];

function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function getInitials(name: string): string {
  return (name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function parseMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} style={{
        background: 'var(--accent-light)', color: 'var(--accent)',
        borderRadius: 4, padding: '1px 5px', fontWeight: 600, fontSize: 13,
      }}>
        {part}
      </span>
    ) : part
  );
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const workspaceId = useAuthStore(s => s.currentWorkspace?.id);
  const currentUser = useAuthStore(s => s.user);

  const [activeTab,      setActiveTab]      = useState<Tab>('team');
  const [messages,       setMessages]       = useState<any[]>([]);
  const [dmMessages,     setDmMessages]     = useState<any[]>([]);
  const [members,        setMembers]        = useState<any[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [activeDM,       setActiveDM]       = useState('');
  const [teamInput,      setTeamInput]      = useState('');
  const [dmInput,        setDmInput]        = useState('');
  const [hoveredBubble,  setHoveredBubble]  = useState<string | null>(null);

  const teamEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef   = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (!workspaceId) return;

    api.workspaces.members(workspaceId).then(res => {
      if (res.success) setMembers((res.data as any).members ?? []);
    });
    api.messages.list(workspaceId).then(res => {
      if (res.success) setMessages((res.data as any).messages ?? []);
    });
    api.messages.pinned(workspaceId).then(res => {
      if (res.success) setPinnedMessages((res.data as any).messages ?? []);
    });
  }, [workspaceId]);

  // Load DMs when active contact changes
  useEffect(() => {
    if (!workspaceId || !activeDM) return;
    api.messages.dm(workspaceId, activeDM).then(res => {
      if (res.success) setDmMessages((res.data as any).messages ?? []);
    });
  }, [workspaceId, activeDM]);

  // Auto-scroll
  useEffect(() => { teamEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeDM, dmMessages]);

  const getMember = (userId: string) => members.find(m => m.id === userId);

  const handleSend = async (isDM: boolean) => {
    const text = isDM ? dmInput.trim() : teamInput.trim();
    if (!text || !workspaceId) return;
    if (isDM) setDmInput(''); else setTeamInput('');

    const result = await api.messages.send(workspaceId, {
      text,
      receiverId: isDM && activeDM ? activeDM : undefined,
    });
    if (result.success) {
      const msg = (result.data as any).message;
      if (isDM) setDmMessages(prev => [...prev, msg]);
      else {
        setMessages(prev => [...prev, msg]);
        // Fire mention notifications for team chat
        const mentionRegex = /@(\w+)/g;
        const mentionedNames = [...text.matchAll(mentionRegex)].map(m => m[1]);
        for (const name of mentionedNames) {
          const mentioned = members.find((m: any) =>
            m.name.toLowerCase().startsWith(name.toLowerCase())
          );
          if (mentioned && mentioned.id !== currentUser?.id) {
            createNotification({
              userId: mentioned.id,
              workspaceId,
              type: 'mention',
              title: 'You were mentioned',
              body: `${currentUser?.name} mentioned you: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`,
              triggeredById: currentUser?.id,
            });
          }
        }
      }
    }
  };

  // Group consecutive same-sender messages
  type Group = { senderId: string; self: boolean; msgs: any[] };
  function groupMessages(list: any[]): Group[] {
    const groups: Group[] = [];
    for (const msg of list) {
      const last = groups[groups.length - 1];
      const self = msg.senderId === currentUser?.id;
      if (last && last.senderId === msg.senderId) last.msgs.push(msg);
      else groups.push({ senderId: msg.senderId, self, msgs: [msg] });
    }
    return groups;
  }

  const teamGroups   = groupMessages(messages);
  const dmGroups     = groupMessages(dmMessages);
  const dmPeers      = members.filter(m => m.id !== currentUser?.id);
  const activeMember = getMember(activeDM);

  const mentions = messages.filter(m =>
    m.text.toLowerCase().includes(`@${currentUser?.name?.split(' ')[0].toLowerCase() ?? '___'}`)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 52, flexShrink: 0,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          {(['team', 'mentions', 'dm'] as Tab[]).map(tab => {
            const label = tab === 'team' ? 'Team Chat' : tab === 'mentions' ? 'Mentions' : 'Direct Messages';
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 0', marginRight: 28, fontSize: 13, fontWeight: 600,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'var(--transition)',
                }}
              >
                {label}
                {tab === 'mentions' && mentions.length > 0 && (
                  <span style={{
                    background: 'var(--accent)', color: 'white',
                    fontSize: 9, fontWeight: 700, borderRadius: 99,
                    padding: '1px 5px', lineHeight: 1.6,
                  }}>
                    {mentions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Online avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {members.slice(0, 5).map((m, i) => (
              <div
                key={m.id}
                title={m.name}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: hashColor(m.id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: 'white',
                  border: '2px solid var(--surface)',
                  marginLeft: i === 0 ? 0 : -6,
                  position: 'relative', zIndex: members.length - i,
                }}
              >
                {getInitials(m.name)}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
            {members.length} online
          </span>
        </div>
      </div>

      {/* ── TAB 1: Team Chat ── */}
      {activeTab === 'team' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Messages column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 2 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {teamGroups.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 48 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>No messages yet. Start the conversation 👋</span>
                </div>
              )}

              {teamGroups.map((group, gi) => {
                const member = getMember(group.senderId);
                const name   = member?.name ?? group.senderId;
                const color  = hashColor(group.senderId);
                return (
                  <div
                    key={gi}
                    style={{
                      display: 'flex', gap: 12, marginTop: gi > 0 ? 16 : 0,
                      flexDirection: group.self ? 'row-reverse' : 'row',
                    }}
                  >
                    {group.self ? (
                      <div style={{ width: 32, flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'white',
                        flexShrink: 0, alignSelf: 'flex-start',
                      }}>
                        {getInitials(name)}
                      </div>
                    )}

                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 3,
                      alignItems: group.self ? 'flex-end' : 'flex-start',
                      maxWidth: 640,
                    }}>
                      {!group.self && (
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                            {formatTime(group.msgs[0].createdAt)}
                          </span>
                        </div>
                      )}

                      {group.msgs.map((msg: any) => (
                        <div
                          key={msg.id}
                          style={{ position: 'relative' }}
                          onMouseEnter={() => setHoveredBubble(msg.id)}
                          onMouseLeave={() => setHoveredBubble(null)}
                        >
                          {hoveredBubble === msg.id && (
                            <div style={{
                              position: 'absolute', top: -32,
                              left: group.self ? 'auto' : 0,
                              right: group.self ? 0 : 'auto',
                              zIndex: 5,
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              borderRadius: 20, padding: '3px 8px',
                              display: 'flex', gap: 6, fontSize: 14,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                              boxShadow: 'var(--shadow-sm)',
                            }}>
                              <span>👍</span><span>❤️</span><span>😂</span>
                            </div>
                          )}
                          <div style={{
                            background:   group.self ? 'var(--accent)' : 'var(--surface)',
                            color:        group.self ? 'white' : 'var(--text-primary)',
                            border:       group.self ? 'none' : '1px solid var(--border)',
                            borderRadius: group.self ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                            padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6,
                            maxWidth: 640, display: 'inline-block',
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
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <span style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer' }}>📎</span>
                <textarea
                  value={teamInput}
                  onChange={e => setTeamInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(false); } }}
                  placeholder="Message the team… use @ to mention"
                  rows={1}
                  style={{
                    flex: 1, border: 'none', background: 'none', fontSize: 14,
                    fontFamily: 'var(--font-body)', resize: 'none', outline: 'none',
                    maxHeight: 100, color: 'var(--text-primary)', lineHeight: 1.5,
                  }}
                />
                <button
                  style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    padding: '4px 8px', background: 'transparent', cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  @
                </button>
                <button
                  onClick={() => handleSend(false)}
                  style={{
                    background: 'var(--accent)', color: 'white', border: 'none',
                    borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'var(--transition)',
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
            width: 200, flexShrink: 0,
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            padding: 16, overflowY: 'auto',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              Team
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No members yet</span>
              )}
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: hashColor(m.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {getInitials(m.name)}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                    {m.name.split(' ')[0]}
                  </span>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              Pinned
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pinnedMessages.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No pinned messages</span>
              )}
              {pinnedMessages.slice(0, 3).map((msg: any) => (
                <div key={msg.id} style={{
                  padding: '8px 10px', background: 'var(--bg)',
                  borderRadius: 6, cursor: 'pointer',
                  borderLeft: '3px solid var(--accent)',
                  display: 'flex', gap: 6, transition: 'var(--transition)',
                }}>
                  <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>📌</span>
                  <span style={{
                    fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                  }}>
                    {msg.text}
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
          {mentions.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 48, fontSize: 14, color: 'var(--text-muted)' }}>
              No mentions yet
            </div>
          )}
          {mentions.map((msg: any) => {
            const member = getMember(msg.senderId);
            const name   = member?.name ?? msg.sender?.name ?? msg.senderId;
            return (
              <div key={msg.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: hashColor(msg.senderId),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {getInitials(name)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {parseMentions(msg.text)}
                </p>
                <button
                  onClick={() => { setActiveTab('team'); setTeamInput(`@${name.split(' ')[0]} `); }}
                  style={{
                    fontSize: 11, color: 'var(--text-muted)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0, transition: 'var(--transition)',
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
            width: 200, flexShrink: 0, borderRight: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
            }}>
              Direct Messages
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {dmPeers.length === 0 && (
                <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No members yet
                </div>
              )}
              {dmPeers.map(m => {
                const isActive = activeDM === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveDM(m.id)}
                    style={{
                      padding: '9px 16px', cursor: 'pointer',
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 9, transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: hashColor(m.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {getInitials(m.name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                      {m.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DM conversation */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {!activeDM ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 48 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Select a member to start a conversation</span>
                </div>
              ) : dmGroups.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontSize: 28 }}>💬</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Start a conversation with {activeMember?.name?.split(' ')[0] ?? 'this person'}
                  </span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Today</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>

                  {dmGroups.map((group, gi) => {
                    const member = getMember(group.senderId);
                    const name   = member?.name ?? group.senderId;
                    return (
                      <div
                        key={gi}
                        style={{
                          display: 'flex', gap: 12, marginTop: gi > 0 ? 16 : 0,
                          flexDirection: group.self ? 'row-reverse' : 'row',
                        }}
                      >
                        {group.self ? (
                          <div style={{ width: 32, flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: hashColor(group.senderId),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: 'white',
                            flexShrink: 0, alignSelf: 'flex-start',
                          }}>
                            {getInitials(name)}
                          </div>
                        )}
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: 3,
                          alignItems: group.self ? 'flex-end' : 'flex-start', maxWidth: 520,
                        }}>
                          {!group.self && (
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                                {formatTime(group.msgs[0].createdAt)}
                              </span>
                            </div>
                          )}
                          {group.msgs.map((msg: any, mi: number) => (
                            <div key={mi} style={{
                              background:   group.self ? 'var(--accent)' : 'var(--surface)',
                              color:        group.self ? 'white' : 'var(--text-primary)',
                              border:       group.self ? 'none' : '1px solid var(--border)',
                              borderRadius: group.self ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                              padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6,
                              maxWidth: 520, display: 'inline-block',
                            }}>
                              {msg.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={dmEndRef} />
            </div>

            {/* DM input */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <textarea
                  value={dmInput}
                  onChange={e => setDmInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(true); } }}
                  placeholder={activeDM ? `Message ${activeMember?.name?.split(' ')[0] ?? ''}…` : 'Select a member…'}
                  disabled={!activeDM}
                  rows={1}
                  style={{
                    flex: 1, border: 'none', background: 'none', fontSize: 14,
                    fontFamily: 'var(--font-body)', resize: 'none', outline: 'none',
                    maxHeight: 100, color: 'var(--text-primary)', lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={() => handleSend(true)}
                  disabled={!activeDM}
                  style={{
                    background: 'var(--accent)', color: 'white', border: 'none',
                    borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                    cursor: activeDM ? 'pointer' : 'not-allowed',
                    opacity: activeDM ? 1 : 0.4, transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { if (activeDM) e.currentTarget.style.background = '#C04808'; }}
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
