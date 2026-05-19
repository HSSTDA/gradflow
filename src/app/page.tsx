'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopNav             from '@/components/layout/TopNav';
import NotificationBell  from '@/components/layout/NotificationBell';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { useMeetingsStore } from '@/store/meetingsStore';
import { useFilesStore } from '@/store/filesStore';
import { useImportantStore } from '@/store/importantStore';
import { useMilestonesStore } from '@/store/milestonesStore';
import DashboardPage  from '@/components/modules/dashboard/DashboardPage';
import ImportantPage  from '@/components/modules/important/ImportantPage';
import TasksPage      from '@/components/modules/tasks/TasksPage';
import FilesPage      from '@/components/modules/files/FilesPage';
import TimelinePage   from '@/components/modules/timeline/TimelinePage';
import MeetingsPage   from '@/components/modules/meetings/MeetingsPage';
import ChatPage       from '@/components/modules/chat/ChatPage';
import SettingsPage   from '@/components/modules/settings/SettingsPage';

type Page =
  | 'dashboard'
  | 'important'
  | 'tasks'
  | 'chat'
  | 'files'
  | 'timeline'
  | 'meetings'
  | 'settings';

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { currentWorkspace, user, logout, fetchWorkspaces } = useAuthStore();
  const { fetchTasks } = useTasksStore();
  const { fetchMeetings } = useMeetingsStore();
  const { fetchFiles } = useFilesStore();
  const { fetchItems } = useImportantStore();
  const { fetchMilestones } = useMilestonesStore();

  // Ensure currentWorkspace is populated after login (persist may not survive logout/re-login)
  useEffect(() => {
    if (user) fetchWorkspaces()
  }, [user])

  useEffect(() => {
    if (!currentWorkspace) return
    const id = currentWorkspace.id
    Promise.all([
      fetchTasks(id),
      fetchMeetings(id),
      fetchFiles(id),
      fetchMilestones(id),
      fetchItems(id),
    ]).catch(console.error)
  }, [currentWorkspace?.id])

  useEffect(() => {
    const handleFocus = () => {
      if (!currentWorkspace?.id) return
      const id = currentWorkspace.id
      Promise.all([
        fetchTasks(id),
        fetchMeetings(id),
        fetchFiles(id),
        fetchMilestones(id),
        fetchItems(id),
      ]).catch(console.error)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [currentWorkspace?.id])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    router.replace('/auth')
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <>
      <TopNav activePage={activePage} onNavigate={(p) => setActivePage(p as Page)} />

      {/* Notification bell */}
      <div style={{ position: 'fixed', top: 16, right: 64, zIndex: 60 }}>
        <NotificationBell />
      </div>

      {/* User menu — top-right */}
      <div ref={menuRef} style={{ position: 'fixed', top: 16, right: 20, zIndex: 60 }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)',
          }}
          aria-label="User menu"
        >
          {initials}
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 44, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
            minWidth: 200, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              fontSize: 13, color: 'var(--text-primary)', fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name ?? 'Account'}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              padding: '4px 16px 8px',
            }}>
              {user?.email}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
              <button
                onClick={() => { setActivePage('settings'); setMenuOpen(false); }}
                style={{
                  width: '100%', padding: '9px 16px', border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                ⚙ Workspace Settings
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '9px 16px', border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, color: 'var(--red)', fontWeight: 500,
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        {activePage === 'dashboard' ? (
          <DashboardPage onNavigate={p => setActivePage(p as Page)} />
        ) : activePage === 'important' ? (
          <ImportantPage />
        ) : activePage === 'tasks' ? (
          <TasksPage />
        ) : activePage === 'files' ? (
          <FilesPage />
        ) : activePage === 'timeline' ? (
          <TimelinePage />
        ) : activePage === 'meetings' ? (
          <MeetingsPage />
        ) : activePage === 'chat' ? (
          <ChatPage />
        ) : activePage === 'settings' ? (
          <SettingsPage
            workspaceId={currentWorkspace?.id ?? ''}
            currentUserId={user?.id ?? ''}
            currentUserRole={currentWorkspace?.myRole ?? 'MEMBER'}
          />
        ) : (
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
            <span className="text-[13px] text-[var(--text-muted)] uppercase tracking-widest">
              {activePage}
            </span>
          </div>
        )}
      </main>
    </>
  );
}
