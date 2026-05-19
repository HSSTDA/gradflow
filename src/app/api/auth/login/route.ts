import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`login:${ip}`, 10, 60000)) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password)
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user)
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid)
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })

    const token = signToken(user.id, user.email)
    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
        token
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
