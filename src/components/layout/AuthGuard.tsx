'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, fetchWorkspaces, currentWorkspace } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (!user) {
        window.location.href = '/auth'
        return
      }
      await fetchWorkspaces()
      setChecking(false)
    }
    check()
  }, [])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'var(--text-muted)',
      }}>
        Loading GradFlow…
      </div>
    )
  }

  if (!currentWorkspace) {
    window.location.href = '/workspace/new'
    return null
  }

  return <>{children}</>
}
