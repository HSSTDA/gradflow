import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.workspaceInvite.count()
    const latest = await prisma.workspaceInvite.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({
      success: true,
      count,
      latest: latest ? { id: latest.id, token: latest.token, email: latest.email, expiresAt: latest.expiresAt } : null
    })
  } catch (err: unknown) {
    const e = err as { message?: string }
    return NextResponse.json({ success: false, error: e.message })
  }
}
