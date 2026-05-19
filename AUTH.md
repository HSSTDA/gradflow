# GradFlow — Auth & Workspace

## Flow
1. User signs up → POST /api/auth/signup → gets JWT token
2. Token stored in Zustand persist (localStorage key: gradflow_auth)
3. Redirected to /workspace/new → creates workspace → stored in currentWorkspace
4. All subsequent pages: AuthGuard checks user exists, redirects to /auth if not

## Hydration issue (IMPORTANT)
Zustand persist has a hydration delay on Next.js.
AuthGuard uses a hydrated flag (setTimeout 100ms) before checking user.
Never redirect before hydrated = true.

## Auth store (useAuthStore)
- user: { id, name, email, avatarUrl }
- token: string (JWT, 7 days expiry)
- currentWorkspace: { id, name, slug, myRole }
- workspaces: array
- login(), signup(), logout(), fetchWorkspaces(), setCurrentWorkspace()

## API Routes
POST /api/auth/signup → { user, token }
POST /api/auth/login  → { user, token }
GET  /api/auth/me     → { user }
GET  /api/workspaces  → { workspaces }
POST /api/workspaces  → { workspace }
GET  /api/workspaces/[wid]/members → { members: [{id, name, email, avatarUrl, role}] }

## JWT
lib/auth.ts → signToken(userId, email) / verifyToken(token)
All protected routes: extract Bearer token from Authorization header
