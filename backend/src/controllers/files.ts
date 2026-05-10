import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getFiles = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { folder } = req.query

    const files = await prisma.file.findMany({
      where: {
        workspaceId,
        ...(folder && folder !== 'All Files' && { folder: folder as string })
      },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const allFiles = await prisma.file.findMany({
      where: { workspaceId },
      select: { folder: true }
    })

    const folderCounts = allFiles.reduce((acc, f) => {
      acc[f.folder] = (acc[f.folder] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return res.json({
      success: true,
      data: { files, folderCounts, total: allFiles.length }
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const createFile = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { name, type, folder, size, url } = req.body

    if (!name || !type || !folder || !url) {
      return res.status(400).json({ success: false, error: 'name, type, folder, url required' })
    }

    const validTypes = ['pdf', 'docx', 'pptx']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid file type' })
    }

    const file = await prisma.file.create({
      data: {
        name: name.trim(),
        type,
        folder: folder.trim(),
        size: size || 'Unknown',
        url,
        workspaceId,
        uploadedById: req.userId!,
      },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } }
      }
    })

    return res.status(201).json({ success: true, data: { file } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileId = req.params.fileId as string
    const workspaceId = req.params.workspaceId as string

    const existing = await prisma.file.findFirst({
      where: { id: fileId, workspaceId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'File not found' })
    }

    if (existing.uploadedById !== req.userId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.userId! } }
      })
      if (!member || member.role === 'MEMBER') {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this file' })
      }
    }

    await prisma.file.delete({ where: { id: fileId } })

    return res.json({ success: true, data: { message: 'File deleted' } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileId = req.params.fileId as string
    const workspaceId = req.params.workspaceId as string

    const file = await prisma.file.findFirst({
      where: { id: fileId, workspaceId },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } }
      }
    })

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' })
    }

    return res.json({ success: true, data: { file } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
