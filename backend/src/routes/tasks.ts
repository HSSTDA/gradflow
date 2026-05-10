import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyWorkspaceAccess } from '../middleware/workspace'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from '../controllers/tasks'

export const tasksRouter = Router({ mergeParams: true })

tasksRouter.use(verifyToken)
tasksRouter.use(verifyWorkspaceAccess)

tasksRouter.get('/', getTasks)
tasksRouter.post('/', createTask)
tasksRouter.patch('/:taskId', updateTask)
tasksRouter.delete('/:taskId', deleteTask)

tasksRouter.post('/:taskId/subtasks', createSubtask)
tasksRouter.patch('/:taskId/subtasks/:subtaskId', updateSubtask)
tasksRouter.delete('/:taskId/subtasks/:subtaskId', deleteSubtask)
