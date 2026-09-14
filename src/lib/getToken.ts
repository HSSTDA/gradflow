import { NextRequest } from 'next/server'

export function getToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }
  return req.cookies.get('gradflow_token')?.value ?? null
}
