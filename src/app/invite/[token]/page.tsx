'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface InviteDetails {
  email: string
  role: string
  workspaceName: string
  inviterName: string
  expiresAt: string
}

type AuthMode = 'signup' | 'login'

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()
  const { user, login, signup, fetchWorkspaces, setCurrentWorkspace, isLoading: authLoading, clearError } = useAuthStore()

  const [invite, setInvite]         = useState<InviteDetails | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)

  const [mode, setMode]       = useState<AuthMode>('signup')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invite/${token}`)
      const json = await res.json()
      if (!json.success) {
        setInviteError(json.error)
      } else {
        setInvite(json.data.invite)
        setEmail(json.data.invite.email)
      }
      setLoadingInvite(false)
    }
    load()
  }, [token])

  async function acceptAndRedirect() {
    const res = await api.invites.accept(token)
    if (!res.success) {
      setFormError((res as { success: false; error: string }).error)
      setSubmitting(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { workspace } = (res.data as any)
    await fetchWorkspaces()
    const { workspaces } = useAuthStore.getState()
    const joined = workspaces.find((w) => w.id === workspace.id)
    if (joined) setCurrentWorkspace(joined)
    router.replace('/')
  }

  async function handleJoin() {
    setSubmitting(true)
    setFormError(null)
    await acceptAndRedirect()
  }

  async function handleAuth() {
    setSubmitting(true)
    setFormError(null)
    clearError()

    let ok = false
    if (mode === 'login') {
      ok = await login(email, password)
    } else {
      ok = await signup(name, email, password)
    }

    if (!ok) {
      setFormError(useAuthStore.getState().error || 'Authentication failed')
      setSubmitting(false)
      return
    }

    await acceptAndRedirect()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '11px 0',
    background: submitting ? 'var(--accent-muted)' : 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 700,
    cursor: submitting ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'var(--transition)',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 44px',
        width: '100%',
        maxWidth: 420,
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40,
            background: 'var(--accent)',
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontFamily: 'var(--font-display)',
            color: 'white',
            fontWeight: 700,
            marginBottom: 10,
          }}>G</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
            GradFlow
          </div>
        </div>

        {loadingInvite && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading invitation…</p>
        )}

        {!loadingInvite && inviteError && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'var(--red-light)',
              color: 'var(--red)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 16,
            }}>
              {inviteError}
            </div>
            <a href="/auth" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
              Go to sign in
            </a>
          </div>
        )}

        {!loadingInvite && invite && (
          <>
            {/* Invite info */}
            <div style={{
              background: 'var(--accent-light)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: 24,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                {invite.inviterName} invited you to join
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
              }}>
                {invite.workspaceName}
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '3px 10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}>
                {invite.role}
              </div>
            </div>

            {formError && (
              <div style={{
                background: 'var(--red-light)',
                color: 'var(--red)',
                fontSize: 13,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontWeight: 500,
              }}>
                {formError}
              </div>
            )}

            {/* Already logged in */}
            {user ? (
              user.email.toLowerCase() === invite.email.toLowerCase() ? (
                <button onClick={handleJoin} disabled={submitting} style={btnPrimary}>
                  {submitting ? 'Joining…' : `Join ${invite.workspaceName}`}
                </button>
              ) : (
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}>
                  This invite was sent to <strong>{invite.email}</strong>.<br />
                  You&apos;re signed in as <strong>{user.email}</strong>.<br />
                  <a href="/auth" style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
                    Sign in with the correct account
                  </a>
                </div>
              )
            ) : (
              <>
                {/* Mode toggle */}
                <div style={{
                  display: 'flex',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 3,
                  marginBottom: 20,
                }}>
                  {(['signup', 'login'] as AuthMode[]).map((m) => (
                    <button key={m} onClick={() => { setMode(m); setFormError(null); clearError() }} style={{
                      flex: 1,
                      padding: '7px 0',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      fontFamily: 'var(--font-body)',
                      background: mode === m ? 'var(--surface)' : 'transparent',
                      color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                    }}>
                      {m === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {mode === 'signup' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Sara Ahmed"
                        style={inputStyle}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      onKeyDown={e => e.key === 'Enter' && handleAuth()}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <button
                  onClick={handleAuth}
                  disabled={submitting || authLoading}
                  style={{ ...btnPrimary, marginTop: 20 }}
                >
                  {submitting || authLoading
                    ? 'Please wait…'
                    : mode === 'login'
                    ? `Sign In & Join ${invite.workspaceName}`
                    : `Create Account & Join ${invite.workspaceName}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
