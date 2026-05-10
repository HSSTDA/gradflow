'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

export default function NewWorkspacePage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, setCurrentWorkspace } = useAuthStore()

  useEffect(() => {
    if (!user) window.location.href = '/auth'
  }, [user])

  const handleCreate = async () => {
    if (!name.trim()) return setError('Workspace name is required')
    setLoading(true)
    setError('')
    const result = await api.workspaces.create({ name, description })
    if (!result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((result as any).error)
      setLoading(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { workspace } = (result.data as any)
    setCurrentWorkspace({ ...workspace, myRole: 'OWNER' })
    window.location.href = '/'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 44px',
        width: '100%',
        maxWidth: 440,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>Create your workspace</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            A workspace is your team&apos;s home in GradFlow
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-light)', color: 'var(--red)',
            fontSize: 13, padding: '10px 14px',
            borderRadius: 'var(--radius-sm)', marginBottom: 16, fontWeight: 500,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. AI Graduation Project"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14, fontFamily: 'var(--font-body)',
                background: 'var(--bg)', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={3}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14, fontFamily: 'var(--font-body)',
                background: 'var(--bg)', color: 'var(--text-primary)',
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: '100%', marginTop: 20,
            padding: '11px 0',
            background: loading ? 'var(--accent-muted)' : 'var(--accent)',
            color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'var(--transition)',
          }}
        >
          {loading ? 'Creating…' : 'Create Workspace →'}
        </button>
      </div>
    </div>
  )
}
