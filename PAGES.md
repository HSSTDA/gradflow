# GradFlow — Pages & Navigation

## Navigation
Floating pill TopNav — fixed top-center, hides on scroll, shows on mouse near top
Pages: dashboard · important · tasks · chat · files · timeline · meetings
State: activePage in src/app/page.tsx via useState

## Page files
src/components/modules/
├── dashboard/DashboardPage.tsx   ← 2x2 grid: Schedule, Deadlines, Tasks, Files + Important section
├── tasks/TasksPage.tsx           ← Kanban + List + Calendar, parent tasks + subtasks
├── important/ImportantPage.tsx   ← Pinned cards with expand/collapse
├── chat/ChatPage.tsx             ← Team Chat + Mentions + Direct Messages tabs
├── files/FilesPage.tsx           ← Folder sidebar + file list/grid + preview modal
├── timeline/TimelinePage.tsx     ← Gantt chart with horizontal scroll + Calendar view
└── meetings/MeetingsPage.tsx     ← Meeting cards with notes + action items

## Data flow
All pages read from Zustand stores.
Stores fetch from API on mount (triggered from page.tsx useEffect when currentWorkspace changes).
Stores: useTasksStore, useMeetingsStore, useFilesStore, useImportantStore, useAuthStore

## Empty states
All widgets show empty state message when array length === 0.
No mock/hardcoded data anywhere — all real from API.
