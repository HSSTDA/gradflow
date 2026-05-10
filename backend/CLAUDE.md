# GradFlow — Backend Agent

Read /CLAUDE.md first for full project context.

## Your Responsibility
Build and maintain the REST API and database layer.

## Stack
- Runtime: Node.js + TypeScript
- Framework: Express.js
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT (jsonwebtoken + bcryptjs)
- Realtime: Socket.io (chat)

## Architecture Pattern
Routes → Controllers → Prisma

Routes: define endpoints, apply middleware
Controllers: business logic, call prisma, return response
Middleware: auth check, workspace access check

## Auth Flow
1. POST /api/auth/signup → hash password → create user → return JWT
2. POST /api/auth/login → verify password → return JWT
3. All protected routes use verifyToken middleware
4. JWT payload: { userId, email }

## Workspace Access
Every resource route checks:
1. verifyToken (user is logged in)
2. verifyWorkspaceAccess (user is member of that workspace)

## Response Format (always consistent)
Success: { success: true, data: {...} }
Error:   { success: false, error: 'message' }

## File Structure
backend/
├── prisma/
│   └── schema.prisma     ← single source of truth for DB shape
├── src/
│   ├── index.ts           ← Express app entry, route registration
│   ├── config/env.ts      ← typed env vars
│   ├── lib/prisma.ts      ← singleton PrismaClient
│   ├── routes/            ← thin, endpoint definitions + middleware
│   ├── controllers/       ← business logic, prisma calls, responses
│   └── middleware/
│       ├── auth.ts        ← verifyToken, attaches req.userId
│       └── workspace.ts   ← verifyWorkspaceAccess
├── .env                   ← not committed
├── .env.example           ← committed, empty values
└── package.json

## Database Models
User · Workspace · WorkspaceMember · Task · Subtask · File · Meeting · ActionItem · Message
All resource models carry workspaceId (FK to Workspace, cascade delete).

## API Endpoints
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me

GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:workspaceId
POST   /api/workspaces/:workspaceId/invite

GET    /api/tasks/:workspaceId
POST   /api/tasks/:workspaceId
PATCH  /api/tasks/:workspaceId/:id
DELETE /api/tasks/:workspaceId/:id

GET    /api/files/:workspaceId
POST   /api/files/:workspaceId
DELETE /api/files/:workspaceId/:id

GET    /api/meetings/:workspaceId
POST   /api/meetings/:workspaceId
PATCH  /api/meetings/:workspaceId/:id

GET    /api/messages/:workspaceId?room=general
POST   /api/messages/:workspaceId

## Rules
1. Never return passwords in responses
2. Always validate input with express-validator
3. All routes except /auth/* require verifyToken middleware
4. Use async/await, wrap controllers in try/catch
5. Return consistent { success, data/error } format
6. workspaceId always verified against DB — never trust client claim alone

## Running locally
cd backend
npm run dev          # ts-node with nodemon, port 4000
npm run db:migrate   # apply schema migrations
npm run db:studio    # open Prisma Studio

## Do not touch frontend src/ directory
