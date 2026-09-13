'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface WorkspaceMember {
  id:       string;
  name:     string;
  email:    string;
  avatarUrl?: string;
  role:     'OWNER' | 'ADMIN' | 'MEMBER';
}

interface PendingInvite {
  id:        string;
  email:     string;
  role:      string;
  expiresAt: string;
  createdAt: string;
  createdBy: { name: string };
}

interface Props {
  workspaceId:     string;
  currentUserId:   string;
  currentUserRole: string;
}

const ROLE_CLS: Record<string, string> = {
  OWNER:  'bg-[var(--accent-light)]  text-[var(--accent)]',
  ADMIN:  'bg-[var(--blue-light)]    text-[var(--blue)]',
  MEMBER: 'bg-[var(--border)]        text-[var(--text-muted)]',
}

const AVATAR_COLORS = ['#D4500A', '#2563EB', '#16A34A', '#7C3AED', '#D97706']

function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function daysUntil(dateStr: string) {
  const ms = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

export default function SettingsPage({ workspaceId, currentUserId, currentUserRole }: Props) {
  const [members,    setMembers]    = useState<WorkspaceMember[]>([]);
  const [invites,    setInvites]    = useState<PendingInvite[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [inviteMsg,   setInviteMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviting,    setInviting]    = useState(false);

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    console.log('[SettingsPage] fetching members for workspaceId:', workspaceId);
    const [membersRes, invitesRes] = await Promise.all([
      api.workspaces.members(workspaceId),
      canManage ? api.invitations.list(workspaceId) : Promise.resolve({ success: false, error: '' }),
    ]);
    console.log('[SettingsPage] membersRes:', membersRes);
    console.log('[SettingsPage] invitesRes:', invitesRes);
    if (membersRes.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMembers((membersRes.data as any).members ?? []);
    }
    if (invitesRes.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInvites((invitesRes.data as any).invites ?? []);
    }
    setLoading(false);
  }, [workspaceId, canManage]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function handleInvite() {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    setInviteMsg(null);
    const res = await api.invitations.create(workspaceId, { email: inviteEmail.trim(), role: inviteRole });
    if (res.success) {
      setInviteMsg({ type: 'success', text: `Invitation sent to ${inviteEmail.trim()}` });
      setInviteEmail('');
      await loadMembers();
    } else {
      setInviteMsg({ type: 'error', text: (res as { success: false; error: string }).error });
    }
    setInviting(false);
  }

  async function handleRemove(member: WorkspaceMember) {
    if (!window.confirm(`Remove ${member.name} from this workspace?`)) return;
    setRemovingId(member.id);
    const res = await api.workspaces.removeMember(workspaceId, member.id);
    if (res.success) await loadMembers();
    setRemovingId(null);
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 40px 80px' }}>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize:   24,
        color:      'var(--text-primary)',
        margin:     '0 0 32px',
        lineHeight: 1.2,
      }}>
        Workspace Members
      </h1>

      {/* Members list */}
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 24,
        overflow:     'hidden',
      }}>
        {loading && (
          <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Loading members…
          </div>
        )}

        {!loading && members.length === 0 && (
          <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No members found.
          </div>
        )}

        {!loading && members.map((m, i) => (
          <div
            key={m.id}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          12,
              padding:      '14px 20px',
              borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: avatarColor(m.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {getInitials(m.name)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {m.name}
                {m.id === currentUserId && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                    (you)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.email}
              </div>
            </div>

            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}
              className={ROLE_CLS[m.role]}>
              {m.role}
            </span>

            {canManage && m.role !== 'OWNER' && m.id !== currentUserId && (
              <button
                onClick={() => handleRemove(m)}
                disabled={removingId === m.id}
                style={{
                  border: '1px solid var(--border)', background: 'transparent',
                  borderRadius: 'var(--radius-sm)', padding: '5px 12px',
                  fontSize: 12, fontWeight: 600, color: 'var(--red)',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'var(--transition)',
                  opacity: removingId === m.id ? 0.5 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {removingId === m.id ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pending invitations */}
      {canManage && !loading && invites.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Pending Invitations</span>
            <span style={{
              background: 'var(--accent-light)', color: 'var(--accent)',
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            }}>
              {invites.length}
            </span>
          </div>
          {invites.map((inv, i) => (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 20px',
              borderBottom: i < invites.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--border)', border: '1.5px dashed var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'var(--text-muted)', flexShrink: 0,
              }}>
                ?
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inv.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Invited by {inv.createdBy.name} · expires in {daysUntil(inv.expiresAt)}d
                </div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: 'var(--border)', color: 'var(--text-muted)', flexShrink: 0,
              }}>
                {inv.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Invite Member
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
            They&apos;ll receive an email with a link to join this workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteMsg(null); }}
              placeholder="teammate@university.edu"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              style={{
                width: '100%', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg)',
                outline: 'none', boxSizing: 'border-box', transition: 'var(--transition)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')}
                style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)',
                  background: 'var(--bg)', cursor: 'pointer', outline: 'none',
                  transition: 'var(--transition)',
                }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>

              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                style={{
                  flex: 1, background: 'var(--accent)', border: 'none',
                  borderRadius: 'var(--radius-sm)', padding: '9px 20px',
                  fontSize: 13, fontWeight: 700, color: 'white',
                  cursor: 'pointer', transition: 'var(--transition)',
                  opacity: !inviteEmail.trim() || inviting ? 0.45 : 1,
                }}
              >
                {inviting ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>

            {inviteMsg && (
              <p style={{
                fontSize: 13, fontWeight: 500, margin: 0,
                color: inviteMsg.type === 'success' ? 'var(--green)' : 'var(--red)',
              }}>
                {inviteMsg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
