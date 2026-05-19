import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file        = formData.get('file') as File
    const workspaceId = formData.get('workspaceId') as string

    if (!file || !workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing file or workspaceId' }, { status: 400 })
    }

    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ success: false, error: 'No token' }, { status: 401 })

    const { userId } = verifyToken(token)

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt  = file.name.split('.').pop()
    const filePath = `${workspaceId}/${Date.now()}_${file.name}`

    const { data, error } = await getSupabaseAdmin().storage
      .from('gradflow-files')
      .upload(filePath, buffer, { contentType: file.type, upsert: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const { data: urlData } = getSupabaseAdmin().storage
      .from('gradflow-files')
      .getPublicUrl(filePath)

    const url = urlData.publicUrl

    const type   = ['pdf', 'docx', 'pptx'].includes(fileExt || '') ? fileExt : 'pdf'
    const folder = type === 'pptx' ? 'Design' : 'Documents'
    const size   = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`

    const dbFile = await prisma.file.create({
      data: {
        name: file.name,
        type: type as string,
        folder,
        size,
        url,
        workspaceId,
        uploadedById: userId,
      },
      include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
    })

    const { uploader, ...rest } = dbFile
    return NextResponse.json({ success: true, data: { file: { ...rest, uploadedBy: uploader } } })

  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
