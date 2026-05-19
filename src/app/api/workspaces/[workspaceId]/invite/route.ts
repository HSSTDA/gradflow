import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const { userId: requesterId } = verifyToken(token)
    const { workspaceId } = await params

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterId } }
    })
    if (!requester || requester.role === 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Only admins can invite members' }, { status: 403 })
    }

    const { email, role } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const invitee = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!invitee) {
      return NextResponse.json(
        { success: false, error: 'No account found with that email. Ask them to sign up first.' },
        { status: 404 }
      )
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitee.id } }
    })
    if (existing) {
      return NextResponse.json({ success: false, error: 'User is already a member of this workspace' }, { status: 409 })
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitee.id,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
    })

    return NextResponse.json({
      success: true,
      data: { ...member.user, role: member.role }
    }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
