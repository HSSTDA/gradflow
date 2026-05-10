import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') +
  '-' + Math.random().toString(36).slice(2, 6)

export const getMyWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true, tasks: true } },
            owner: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role,
    }))

    return res.json({ success: true, data: { workspaces } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body
    const userId = req.userId!

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Workspace name required (min 2 chars)' })
    }

    const slug = generateSlug(name)

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER' }
        }
      },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, name: true, email: true } }
      }
    })

    return res.status(201).json({ success: true, data: { workspace } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } }
          }
        },
        _count: { select: { tasks: true, files: true, meetings: true } }
      }
    })

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' })
    }

    return res.json({ success: true, data: { workspace } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { email, role = 'MEMBER' } = req.body

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' })
    }

    const inviter = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId! } }
    })

    if (!inviter || inviter.role === 'MEMBER') {
      return res.status(403).json({ success: false, error: 'Only admins can invite members' })
    }

    const userToInvite = await prisma.user.findUnique({ where: { email } })
    if (!userToInvite) {
      return res.status(404).json({ success: false, error: 'No user found with that email' })
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: userToInvite.id } }
    })

    if (existing) {
      return res.status(409).json({ success: false, error: 'User is already a member' })
    }

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: userToInvite.id, role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } }
      }
    })

    return res.status(201).json({ success: true, data: { member } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const userId = req.params.userId as string

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId! } }
    })

    if (!requester || requester.role === 'MEMBER') {
      return res.status(403).json({ success: false, error: 'Only admins can remove members' })
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (workspace?.ownerId === userId) {
      return res.status(403).json({ success: false, error: 'Cannot remove workspace owner' })
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } }
    })

    return res.json({ success: true, data: { message: 'Member removed' } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const updateWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { name, description } = req.body

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId! } }
    })

    if (!requester || requester.role === 'MEMBER') {
      return res.status(403).json({ success: false, error: 'Only admins can update workspace' })
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() || null }),
      }
    })

    return res.json({ success: true, data: { workspace } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
