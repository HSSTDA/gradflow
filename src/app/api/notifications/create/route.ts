import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { taskDoneEmail, taskAssignedEmail, mentionEmail, meetingEmail } from '@/lib/emailTemplates'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId, type, title, body, triggeredById } = await req.json()

    if (!rateLimit(`notif:${userId}`, 30, 60000)) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 })
    }

    const notification = await prisma.notification.create({
      data: { userId, workspaceId, type, title, body, triggeredById: triggeredById || null },
    })

    // Send email — fire-and-forget, never blocks the response
    void sendEmailForNotification({ userId, workspaceId, type, title, body, triggeredById })

    return NextResponse.json({ success: true, data: { notification } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

async function sendEmailForNotification({
  userId,
  workspaceId,
  type,
  title,
  body,
  triggeredById,
}: {
  userId: string
  workspaceId: string
  type: string
  title: string
  body: string
  triggeredById?: string | null
}) {
  try {
    const [recipient, triggerer, workspace] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      triggeredById
        ? prisma.user.findUnique({ where: { id: triggeredById }, select: { name: true } })
        : null,
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
    ])

    if (!recipient) return

    const completedBy  = triggerer?.name ?? 'A teammate'
    const workspaceName = workspace?.name ?? 'GradFlow'

    let emailContent: { subject: string; html: string } | null = null

    if (type === 'task_done') {
      // body is: `"${subtask.title}" has been completed`
      const taskTitle = body.replace(/^"/, '').split('"')[0]
      emailContent = taskDoneEmail({
        recipientName: recipient.name,
        taskTitle,
        completedBy,
        workspaceName,
      })
    } else if (type === 'task_assigned') {
      // title is: 'New to-do assigned to you', body is: `You were assigned: "${subtask.title}"`
      const taskTitle = body.replace(/^You were assigned: "/, '').replace(/"$/, '')
      emailContent = taskAssignedEmail({
        recipientName: recipient.name,
        taskTitle,
        assignedBy: completedBy,
        dueDate: null,
        workspaceName,
      })
    } else if (type === 'mention') {
      emailContent = mentionEmail({
        recipientName: recipient.name,
        mentionedBy: completedBy,
        messagePreview: body,
        workspaceName,
      })
    } else if (type === 'meeting') {
      // title is: 'New meeting scheduled', body is: `${meetingTitle} — ${dateLabel}`
      const [meetingTitle, meetingDate] = body.split(' — ')
      emailContent = meetingEmail({
        recipientName: recipient.name,
        meetingTitle: meetingTitle ?? title,
        meetingDate: meetingDate ?? '',
        organizer: completedBy,
        workspaceName,
      })
    }

    if (emailContent) {
      await sendEmail({ to: recipient.email, subject: emailContent.subject, html: emailContent.html })
    }
  } catch (err) {
    console.error(err)
  }
}
