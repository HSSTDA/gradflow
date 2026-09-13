import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const authToken = req.headers.get('authorization')?.split(' ')[1]
    if (!authToken) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    try { verifyToken(authToken) } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
    }
    const { workspaceId } = await params

    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceId, usedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { invites } })
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; meta?: unknown }
    console.error('Invitations GET error:', e.message, e.code, e.meta)
    return NextResponse.json({ success: false, error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const authToken = req.headers.get('authorization')?.split(' ')[1]
    console.log('[INVITE POST] auth header present:', !!authToken)

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    }

    let userId: string
    try {
      const decoded = verifyToken(authToken)
      userId = decoded.userId
      console.log('[INVITE POST] userId:', userId)
    } catch (authErr: unknown) {
      const e = authErr as { message?: string }
      console.error('[INVITE POST] auth failed:', e.message)
      return NextResponse.json({ success: false, error: 'Auth failed: ' + e.message }, { status: 401 })
    }

    const { workspaceId } = await params

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: { select: { name: true } } },
    })
    if (!requester || requester.role === 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Only admins can invite members' }, { status: 403 })
    }

    const { email, role = 'MEMBER' } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      })
      if (alreadyMember) {
        return NextResponse.json({ success: false, error: 'This person is already a member' }, { status: 409 })
      }
    }

    const pendingInvite = await prisma.workspaceInvite.findFirst({
      where: { workspaceId, email: normalizedEmail, usedAt: null, expiresAt: { gt: new Date() } },
    })
    if (pendingInvite) {
      return NextResponse.json(
        { success: false, error: 'An invitation has already been sent to this email' },
        { status: 409 }
      )
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })

    console.log('[INVITE POST] creating invite for:', normalizedEmail, 'workspace:', workspaceId)

    const inviteToken = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invite = await prisma.workspaceInvite.create({
      data: {
        token: inviteToken,
        email: normalizedEmail,
        workspaceId,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        createdById: userId,
        expiresAt,
      },
    })
    console.log('[INVITE POST] saved:', invite.id, invite.token)

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/invite/${inviteToken}`
    console.log('[INVITE POST] invite URL:', inviteUrl)

    await sendEmail({
      to: normalizedEmail,
      subject: `You've been invited to join ${workspace?.name} on GradFlow`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F6F4F0;">
          <div style="background:#fff;border:1px solid #E7E5E0;border-radius:16px;padding:32px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:40px;height:40px;background:#D4500A;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;color:white;font-weight:700;margin-bottom:8px;">G</div>
              <div style="font-size:20px;font-weight:700;color:#1C1917;">GradFlow</div>
            </div>
            <h2 style="color:#1C1917;font-size:18px;margin:0 0 8px;">You've been invited</h2>
            <p style="color:#78716C;font-size:14px;margin:0 0 24px;">
              <strong>${requester.user.name}</strong> invited you to join <strong>${workspace?.name}</strong> on GradFlow.
            </p>
            <a href="${inviteUrl}"
              style="display:block;background:#D4500A;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-align:center;margin-bottom:20px;">
              Accept Invitation
            </a>
            <p style="color:#A8A29E;font-size:12px;text-align:center;margin:0;">This link expires in 7 days.</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json(
      { success: true, data: { invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt } } },
      { status: 201 }
    )
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; meta?: unknown }
    console.error('[INVITE POST] unexpected error:', e.message, e.code, e.meta)
    return NextResponse.json({
      success: false,
      error: e.message || 'Internal server error',
      code: e.code,
    }, { status: 500 })
  }
}
