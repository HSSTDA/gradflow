import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/getToken'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getUser = (req: NextRequest) => {
  const token = getToken(req)
  if (!token) throw new Error('No token')
  return verifyToken(token)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; itemId: string }> }
) {
  try {
    getUser(req)
    const { itemId } = await params
    await prisma.pinnedItem.delete({ where: { id: itemId } })
    return NextResponse.json({ success: true, data: { message: 'Deleted' } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; itemId: string }> }
) {
  try {
    getUser(req)
    const { itemId } = await params
    const { title, body, category, pinned } = await req.json()

    const item = await prisma.pinnedItem.update({
      where: { id: itemId },
      data: {
        ...(title    !== undefined && { title }),
        ...(body     !== undefined && { body }),
        ...(category !== undefined && { category }),
        ...(pinned   !== undefined && { pinned }),
      },
    })
    return NextResponse.json({ success: true, data: { item } })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
