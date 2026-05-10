import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string

    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            dependsOn: { select: { id: true, title: true, done: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { subtasks: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({ success: true, data: { tasks } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const { title, priority = 'MEDIUM', status = 'TODO' } = req.body

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Task title required' })
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        priority,
        status,
        workspaceId,
        createdById: req.userId!,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: true
      }
    })

    return res.status(201).json({ success: true, data: { task } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string
    const workspaceId = req.params.workspaceId as string
    const { title, status, priority } = req.body

    const existing = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title && { title: title.trim() }),
        ...(status && { status }),
        ...(priority && { priority }),
      },
      include: {
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } }
          }
        }
      }
    })

    return res.json({ success: true, data: { task } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string
    const workspaceId = req.params.workspaceId as string

    const existing = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    await prisma.task.delete({ where: { id: taskId } })

    return res.json({ success: true, data: { message: 'Task deleted' } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const createSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string
    const workspaceId = req.params.workspaceId as string
    const { title, assigneeId, dueDate, note, dependsOnId } = req.body

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Subtask title required' })
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    if (assigneeId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: assigneeId } }
      })
      if (!member) {
        return res.status(400).json({ success: false, error: 'Assignee is not a workspace member' })
      }
    }

    const subtask = await prisma.subTask.create({
      data: {
        title: title.trim(),
        note: note?.trim() ?? '',
        dueDate: dueDate || null,
        taskId,
        assigneeId: assigneeId || null,
        dependsOnId: dependsOnId || null,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        dependsOn: { select: { id: true, title: true, done: true } }
      }
    })

    return res.status(201).json({ success: true, data: { subtask } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const updateSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const subtaskId = req.params.subtaskId as string
    const taskId = req.params.taskId as string
    const { title, done, note, assigneeId, dueDate } = req.body

    const existing = await prisma.subTask.findFirst({
      where: { id: subtaskId, taskId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subtask not found' })
    }

    const subtask = await prisma.subTask.update({
      where: { id: subtaskId },
      data: {
        ...(title && { title: title.trim() }),
        ...(done !== undefined && { done }),
        ...(note !== undefined && { note: note.trim() ?? '' }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate || null }),
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        dependsOn: { select: { id: true, title: true, done: true } }
      }
    })

    return res.json({ success: true, data: { subtask } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const deleteSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const subtaskId = req.params.subtaskId as string
    const taskId = req.params.taskId as string

    const existing = await prisma.subTask.findFirst({
      where: { id: subtaskId, taskId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subtask not found' })
    }

    await prisma.subTask.delete({ where: { id: subtaskId } })

    return res.json({ success: true, data: { message: 'Subtask deleted' } })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
