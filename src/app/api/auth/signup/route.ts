import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { validate } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`signup:${ip}`, 5, 60000)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password)
      return NextResponse.json({ success: false, error: 'All fields required' }, { status: 400 })

    if (!validate.email(email))
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })

    const passwordError = validate.password(password)
    if (passwordError)
      return NextResponse.json({ success: false, error: passwordError }, { status: 400 })

    const safeName = validate.text(name, 100)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name: safeName, email, passwordHash },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true }
    })

    const token = signToken(user.id, user.email)
    return NextResponse.json({ success: true, data: { user, token } }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
