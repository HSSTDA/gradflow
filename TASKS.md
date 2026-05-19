# GradFlow — Tasks Module

## Concept
Two-level hierarchy:
- Parent Task = grouper/category (e.g. "Build Auth System")
- Subtask (To-do) = the actual unit of work that moves between columns

## Kanban columns show SUBTASKS, not parent tasks
Each subtask has a status: TODO | IN_PROGRESS | DONE
Status is derived from: subtask.done (boolean) + local inProgressSubtasks Set

## Subtask fields
- title (required)
- assigneeId → User.id (workspace member)
- dueDate → DateTime
- note → String
- done → Boolean
- dependsOnId → another subtask (optional)

## API Routes
POST   /api/workspaces/[wid]/tasks                     → create parent task
DELETE /api/workspaces/[wid]/tasks/[tid]               → delete parent task
PATCH  /api/workspaces/[wid]/tasks/[tid]               → update parent task
POST   /api/workspaces/[wid]/tasks/[tid]/subtasks      → create subtask
PATCH  /api/workspaces/[wid]/tasks/[tid]/subtasks/[sid] → update subtask (done, title, note, dueDate, assigneeId)
DELETE /api/workspaces/[wid]/tasks/[tid]/subtasks/[sid] → delete subtask

## Store
useTasksStore → fetchTasks(workspaceId), createTask, updateTask, deleteTask,
                createSubtask, toggleSubtask, updateSubtask, deleteSubtask

## Key rules
- After ANY mutation: call fetchTasks(workspaceId) to re-render
- workspaceId always from: useAuthStore(state => state.currentWorkspace?.id)
- token from: useAuthStore(state => state.token)
- All API calls go through src/lib/api.ts
