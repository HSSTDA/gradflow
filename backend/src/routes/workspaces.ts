import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyWorkspaceAccess } from '../middleware/workspace'
import {
  getMyWorkspaces,
  createWorkspace,
  getWorkspace,
  inviteMember,
  removeMember,
  updateWorkspace,
} from '../controllers/workspaces'

export const workspacesRouter = Router()

workspacesRouter.use(verifyToken)

workspacesRouter.get('/', getMyWorkspaces)
workspacesRouter.post('/', createWorkspace)

workspacesRouter.get('/:workspaceId', verifyWorkspaceAccess, getWorkspace)
workspacesRouter.patch('/:workspaceId', verifyWorkspaceAccess, updateWorkspace)
workspacesRouter.post('/:workspaceId/invite', verifyWorkspaceAccess, inviteMember)
workspacesRouter.delete('/:workspaceId/members/:userId', verifyWorkspaceAccess, removeMember)
