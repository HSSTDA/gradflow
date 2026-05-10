import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyWorkspaceAccess } from '../middleware/workspace'
import {
  getMeetings,
  createMeeting,
  toggleActionItem,
  deleteMeeting,
} from '../controllers/meetings'

export const meetingsRouter = Router({ mergeParams: true })

meetingsRouter.use(verifyToken)
meetingsRouter.use(verifyWorkspaceAccess)

meetingsRouter.get('/', getMeetings)
meetingsRouter.post('/', createMeeting)
meetingsRouter.patch('/:meetingId/actions/:actionId', toggleActionItem)
meetingsRouter.delete('/:meetingId', deleteMeeting)
