import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const authToken = req.headers.get('authorization')?.split(' ')[1]
    if (!authToken) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    const { userId, email: userEmail } = verifyToken(authToken)
    const { token } = await params

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    })

    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invitation not found' }, { status: 404 })
    }
    if (invite.usedAt) {
      return NextResponse.json({ success: false, error: 'This invitation has already been used' }, { status: 410 })
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'This invitation has expired' }, { status: 410 })
    }
    if (invite.email !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    })

    if (alreadyMember) {
      await prisma.workspaceInvite.update({ where: { token }, data: { usedAt: new Date() } })
      return NextResponse.json({ success: true, data: { workspace: invite.workspace, role: alreadyMember.role } })
    }

    const [member] = await prisma.$transaction([
      prisma.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
      }),
      prisma.workspaceInvite.update({ where: { token }, data: { usedAt: new Date() } }),
    ])

    return NextResponse.json(
      { success: true, data: { workspace: invite.workspace, role: member.role } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
