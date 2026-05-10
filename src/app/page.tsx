'use client';

import { useState, useEffect } from 'react';
import TopNav        from '@/components/layout/TopNav';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { useMeetingsStore } from '@/store/meetingsStore';
import { useFilesStore } from '@/store/filesStore';
import DashboardPage  from '@/components/modules/dashboard/DashboardPage';
import ImportantPage  from '@/components/modules/important/ImportantPage';
import TasksPage      from '@/components/modules/tasks/TasksPage';
import FilesPage      from '@/components/modules/files/FilesPage';
import TimelinePage   from '@/components/modules/timeline/TimelinePage';
import MeetingsPage   from '@/components/modules/meetings/MeetingsPage';
import ChatPage       from '@/components/modules/chat/ChatPage';

type Page =
  | 'dashboard'
  | 'important'
  | 'tasks'
  | 'chat'
  | 'files'
  | 'timeline'
  | 'meetings';

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const { currentWorkspace, user } = useAuthStore();
  const { fetchTasks } = useTasksStore();
  const { fetchMeetings } = useMeetingsStore();
  const { fetchFiles } = useFilesStore();

  useEffect(() => {
    if (!currentWorkspace) return
    fetchTasks(currentWorkspace.id)
    fetchMeetings(currentWorkspace.id)
    fetchFiles(currentWorkspace.id)
  }, [currentWorkspace?.id])

  return (
    <>
      <TopNav activePage={activePage} onNavigate={(p) => setActivePage(p as Page)} />

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
