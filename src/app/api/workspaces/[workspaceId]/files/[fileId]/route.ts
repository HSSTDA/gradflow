import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; fileId: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })
    verifyToken(token)

    const { workspaceId, fileId } = await params

    const file = await prisma.file.findFirst({
      where: { id: fileId, workspaceId }
    })
    if (!file) return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })

    // Delete from Supabase Storage
    const urlParts = file.url.split('/gradflow-files/')
    if (urlParts[1]) {
      await getSupabaseAdmin().storage
        .from('gradflow-files')
        .remove([decodeURIComponent(urlParts[1])])
    }

    await prisma.file.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true, data: { message: 'Deleted' } })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
