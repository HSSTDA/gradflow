import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyWorkspaceAccess } from '../middleware/workspace'
import {
  getMessages,
  getDirectMessages,
  createMessage,
  togglePin,
  getPinnedMessages,
  deleteMessage,
} from '../controllers/messages'

export const messagesRouter = Router({ mergeParams: true })

messagesRouter.use(verifyToken)
messagesRouter.use(verifyWorkspaceAccess)

messagesRouter.get('/', getMessages)
messagesRouter.get('/pinned', getPinnedMessages)
messagesRouter.get('/dm/:userId', getDirectMessages)
messagesRouter.post('/', createMessage)
messagesRouter.patch('/:messageId/pin', togglePin)
messagesRouter.delete('/:messageId', deleteMessage)
