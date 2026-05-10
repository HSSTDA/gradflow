import { Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from './auth'

export const verifyWorkspaceAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const userId = req.userId

    if (!workspaceId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing workspace or user' })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    })

    if (!member) {
      return res.status(403).json({ success: false, error: 'Access denied' })
    }

    next()
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
