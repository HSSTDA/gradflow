@AGENTS.md

# Product Vision

GradFlow is being built as a multi-tenant SaaS platform,
not just a personal graduation project tool.

Target users: any student team working on a group project —
not limited to graduation projects or a single university.

Each team (workspace) is fully isolated:
- Separate tasks, files, meetings, chat, timeline
- Separate members and roles
- No data shared between workspaces

## Multi-Tenancy Architecture (planned)

Workspace:
- id, name, description, createdAt
- Every resource (task, file, meeting, message) belongs to a workspaceId

Member roles per workspace:
- Owner (created the workspace)
- Admin (can invite/remove members, manage settings)
- Member (standard access)

## Authentication Plan
Provider: Clerk (preferred) or Supabase Auth
Flow:
1. User signs up / logs in
2. Creates a workspace OR accepts an invite link
3. Lands on their workspace dashboard
4. Can belong to multiple workspaces (e.g. student in two courses)

## Database Schema Direction (PostgreSQL + Prisma)
Tables:
- users (id, email, name, avatarUrl)
- workspaces (id, name, slug, ownerId)
- workspace_members (workspaceId, userId, role)
- tasks, subtasks, files, meetings, messages — all with workspaceId foreign key

## URL Structure (planned)
/login
/signup
/workspaces — list of user's workspaces
/workspace/[slug]/dashboard
/workspace/[slug]/tasks
/workspace/[slug]/chat
... etc

## Current State vs Target
Current: single hardcoded workspace, no auth, mock data in Zustand stores
Target: full multi-tenant SaaS with auth, real DB, workspace isolation

## Immediate impact on decisions
- Do not hardcode any workspace-specific data in components
- All stores will eventually receive workspaceId as a parameter
- Member data will come from auth context, not hardcoded arrays
- File uploads will go to cloud storage (Cloudinary or Supabase Storage)
- Real-time chat will use Socket.io with workspace-scoped rooms

---

# GradFlow — Project Manager

## What is GradFlow
A graduation project management platform for university student teams.
Inspired by Basecamp simplicity + modern UX. NOT a corporate tool like Jira.
Students open it and start immediately — no learning curve, no complex setup.

## Core Philosophy
- Everything in one place: Tasks, Chat, Files, Timeline, Team, Meetings
- Minimum clicks to do anything
- Feels light and clear, not heavy
- Mobile-friendly eventually

## Current Stack
- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS v4
- Zustand (state management)
- TanStack React Query (server state)
- Lucide React (icons)
- Prisma 7 + PostgreSQL (Supabase) — API routes live in src/app/api/
- bcryptjs + jsonwebtoken — auth
- @prisma/adapter-pg + pg — database driver

## Design System (strictly enforced)
Fonts: DM Serif Display (headings) + Geist (body)
Colors (CSS variables in globals.css):
  --bg: #F6F4F0 | --surface: #FFFFFF
  --accent: #D4500A | --accent-light: #FFF0E8
  --text-primary: #1C1917 | --text-secondary: #78716C | --text-muted: #A8A29E
  --border: #E7E5E0 | --border-strong: #D6D3CD
  --green: #16A34A | --blue: #2563EB | --amber: #D97706 | --red: #DC2626

Radius: --radius-sm: 8px | --radius-md: 12px | --radius-lg: 16px
Shadows: --shadow-sm | --shadow-md | --shadow-lg
Transition: --transition: 0.18s cubic-bezier(0.4, 0, 0.2, 1)

## Navigation
Floating pill navbar — fixed top-center, disappears on scroll, reappears on mouse near top.
Pages: dashboard · important · tasks · chat · files · timeline · team · meetings
State managed in src/app/page.tsx via activePage useState.

## Pages Built — All Complete ✅
✅ Dashboard — greeting, quick actions, 2×2 grid
   (Schedule / Deadlines / Tasks / Files), Important pinned section
✅ Important — pinned cards with expand/collapse, filter tabs,
   category tags, colored left borders
✅ Tasks — Kanban + List + Calendar views, parent tasks with subtasks,
   dependency system, locked state, toast notifications,
   date filter, priority filter
✅ Chat — 3 tabs: Team Chat (mentions parsing, reaction bar hover,
   pinned sidebar, online members) · Mentions feed · Direct Messages
✅ Files — two-panel (folders sidebar + file list),
   grid/list toggle, preview modal (Google Docs Viewer ready)
✅ Timeline — Gantt chart with horizontal scroll, synced panels,
   dependency arrows SVG, today line, Calendar view toggle
✅ Meetings — expandable cards, meeting notes + action items
   two-column layout, Zustand store (useMeetingsStore)

## Zustand Stores Created
- useMeetingsStore (src/store/meetingsStore.ts) — meetings, addMeeting, toggleAction

## Pages Removed
- Team Members page — removed by design decision

## Current Known Issues (to fix next)
- All pages except Meetings use inline mock data — not connected to stores
- No Global Search implemented yet
- No shared data between Dashboard widgets and their source pages

## Next Phase — Zustand Stores
Convert all inline mock data to shared stores:
- useTasksStore — parentTasks, addTask, addSubtask, toggleSubtask
- useFilesStore — files, folders, addFile
- useImportantStore — pinnedItems, addItem, togglePin

## Backend — Next.js API Routes ✅
API routes live in src/app/api/ (no separate backend server).
- Auth: src/app/api/auth/{signup,login,me}/route.ts
- Workspaces: src/app/api/workspaces/route.ts
- Tasks/Files/Meetings/Messages: src/app/api/workspaces/[workspaceId]/*/route.ts
- DB client: src/lib/prisma.ts (PrismaClient with @prisma/adapter-pg)
- Auth helpers: src/lib/auth.ts (signToken, verifyToken)
- API client: src/lib/api.ts (BASE_URL = '' — same-origin calls)
- Schema: prisma/schema.prisma | CLI config: prisma.config.ts

## File Structure
src/
├── app/
│   ├── globals.css       ← design tokens
│   ├── layout.tsx
│   └── page.tsx          ← main shell, activePage state, renders all pages
├── components/
│   ├── layout/
│   │   └── TopNav.tsx    ← floating pill nav
│   ├── modules/
│   │   ├── chat/
│   │   │   └── ChatPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── files/
│   │   │   └── FilesPage.tsx
│   │   ├── important/
│   │   │   └── ImportantPage.tsx
│   │   ├── meetings/
│   │   │   └── MeetingsPage.tsx
│   │   ├── tasks/
│   │   │   └── TasksPage.tsx
│   │   └── timeline/
│   │       └── TimelinePage.tsx
│   └── ui/
│       ├── PreviewModal.tsx
│       └── Toast.tsx
├── app/
│   └── api/
│       ├── auth/{signup,login,me}/route.ts
│       └── workspaces/
│           ├── route.ts
│           └── [workspaceId]/{tasks,files,meetings,messages}/route.ts
├── lib/
│   ├── prisma.ts     ← PrismaClient singleton (adapter-pg)
│   ├── auth.ts       ← signToken / verifyToken
│   └── api.ts        ← typed fetch client
├── store/
│   └── meetingsStore.ts  ← useMeetingsStore
└── types/
    └── index.ts          ← Member, Task, SubTask, ParentTask, etc.

## Team Members (mock data used across all pages)
SA: Sara Ahmed — Team Lead — #D4500A
OK: Omar Khalil — Developer — #2563EB
LH: Lina Hassan — Designer — #16A34A
AN: Ahmed Nour — Researcher — #7C3AED
NS: Nora Salem — Developer — #D97706

## Rules for all agents
1. Never change globals.css design tokens unless explicitly asked
2. Never change TopNav.tsx unless explicitly asked
3. Always use CSS variables, never hardcode colors
4. Keep mock data inline in the component (no separate data files yet)
5. All new pages go in src/components/modules/[pagename]/[PageName]Page.tsx
6. Wire new pages in page.tsx using the activePage switch
7. Keep components focused — one responsibility per file
8. No unnecessary dependencies — use what's already installed

## How to delegate
When given a task:
- If it touches UI, components, or pages → follow src/CLAUDE.md
- If it touches API routes or database → work in src/app/api/ and src/lib/
- If it touches both → split the work clearly
