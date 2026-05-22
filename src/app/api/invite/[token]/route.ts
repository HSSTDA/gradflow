import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
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

    return NextResponse.json({
      success: true,
      data: {
        invite: {
          email: invite.email,
          role: invite.role,
          workspaceName: invite.workspace.name,
          inviterName: invite.createdBy.name,
          expiresAt: invite.expiresAt,
        },
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
