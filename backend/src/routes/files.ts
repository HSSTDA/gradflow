import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyWorkspaceAccess } from '../middleware/workspace'
import { getFiles, createFile, deleteFile, getFile } from '../controllers/files'

export const filesRouter = Router({ mergeParams: true })

filesRouter.use(verifyToken)
filesRouter.use(verifyWorkspaceAccess)

filesRouter.get('/', getFiles)
filesRouter.get('/:fileId', getFile)
filesRouter.post('/', createFile)
filesRouter.delete('/:fileId', deleteFile)
