# GradFlow — Database Schema (Supabase/PostgreSQL via Prisma)

## Key models
User: id, email, name, passwordHash, avatarUrl
Workspace: id, name, slug, description, ownerId
WorkspaceMember: workspaceId, userId, role (OWNER|ADMIN|MEMBER)
Task: id, title, status (TODO|IN_PROGRESS|DONE), priority (LOW|MEDIUM|HIGH), workspaceId, createdById
SubTask: id, title, note, dueDate, done, taskId, assigneeId, dependsOnId
File: id, name, type, folder, size, url, workspaceId, uploadedById
Meeting: id, title, date, duration, type, workspaceId
MeetingNote: id, text, meetingId
ActionItem: id, text, done, meetingId, assigneeId
Message: id, text, workspaceId, senderId, receiverId (null = team chat), isPinned
PinnedItem: id, title, body, category, workspaceId, addedById
Milestone: id, title, description, date, status, workspaceId

## Prisma location
prisma/schema.prisma (root level)
Connection: Supabase session pooler via DATABASE_URL in .env.local

## Important
SubTask has NO status field — only done: boolean
IN_PROGRESS is handled locally in React state (Set<string>)
