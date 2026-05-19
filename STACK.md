# GradFlow — Tech Stack

## Frontend
Next.js 16 (App Router) + TypeScript + React 19
Tailwind CSS v4
Zustand v5 (state + persist to localStorage)
TanStack React Query (installed, not yet used)

## Backend
Next.js API Routes (src/app/api/**)
No separate Express server
Prisma 7 + @prisma/adapter-pg (PostgreSQL adapter)
bcryptjs (password hashing)
jsonwebtoken (JWT auth)

## Database
Supabase PostgreSQL
Connection: Session Pooler (IPv4 compatible)
URL format: postgresql://postgres.[project]:[pass]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres

## Design system
Fonts: DM Serif Display (headings) + Geist (body) — loaded via Google Fonts in globals.css
Colors: CSS variables in src/app/globals.css (--accent: #D4500A, --bg: #F6F4F0, etc)
All colors via CSS variables — never hardcode hex in components

## File structure
src/app/api/           ← API routes
src/app/auth/          ← login/signup page
src/app/workspace/     ← workspace creation
src/components/layout/ ← TopNav, AuthGuard, ClientLayout
src/components/modules/ ← feature pages
src/components/ui/     ← Toast, PreviewModal
src/lib/api.ts         ← fetch wrapper + all API calls
src/lib/auth.ts        ← JWT helpers
src/lib/prisma.ts      ← Prisma client singleton
src/store/             ← Zustand stores
prisma/schema.prisma   ← DB schema

## Deployment target
Frontend + Backend: Vercel (Next.js)
Database: Supabase (already set up, tables created)
