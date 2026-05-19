'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNotificationsStore } from '@/store/notificationsStore'

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  task_done:     { icon: '✓', color: 'var(--green)' },
  task_assigned: { icon: '→', color: 'var(--blue)' },
  mention:       { icon: '@', color: 'var(--accent)' },
  meeting:       { icon: '◈', color: '#7C3AED' },
  deadline:      { icon: '!', color: 'var(--red)' },
}

export default function NotificationBell() {
  const workspaceId = useAuthStore(s => s.currentWorkspace?.id)
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotificationsStore()
  const [showPanel, setShowPanel] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!workspaceId) return
    fetchNotifications(workspaceId)
    const interval = setInterval(() => fetchNotifications(workspaceId), 30000)
    return () => clearInterval(interval)
  }, [workspaceId])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleBellClick = async () => {
    const next = !showPanel
    setShowPanel(next)
    if (next && unreadCount > 0 && workspaceId) {
      await markAllRead(workspaceId)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        aria-label="Notifications"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 15,
          boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
          position: 'relative',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--red)', border: '1.5px solid white',
          }} />
        )}
      </button>

      {/* Dropdown panel */}
      {showPanel && (
        <div style={{
          position: 'absolute', right: 0, top: 44,
          width: 360, background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: 480, overflowY: 'auto',
          zIndex: 100,
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0,
            background: 'var(--surface)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {notifications.some(n => !n.read) && (
              <button
                onClick={() => workspaceId && markAllRead(workspaceId)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--accent)', fontWeight: 500,
                  padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                  transition: 'var(--transition)',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Empty state */}
          {notifications.length === 0 && (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              No notifications yet
            </div>
          )}

          {/* Notification list */}
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? { icon: '•', color: 'var(--text-muted)' }
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'default',
                  transition: 'background var(--transition)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Type icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: cfg.color + '18',
                  border: `1px solid ${cfg.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: cfg.color, fontWeight: 700,
                }}>
                  {cfg.icon}
                </div>

                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {n.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-secondary)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--blue)', marginTop: 8,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
