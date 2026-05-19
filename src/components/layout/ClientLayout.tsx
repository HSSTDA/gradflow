'use client'
import { usePathname } from 'next/navigation'
import AuthGuard from './AuthGuard'

const PUBLIC_ROUTES = ['/auth', '/workspace/new']

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  if (isPublic) return <>{children}</>
  return <AuthGuard>{children}</AuthGuard>
}
