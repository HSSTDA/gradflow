'use client'
import { usePathname } from 'next/navigation'
import AuthGuard from './AuthGuard'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = pathname.startsWith('/auth') || pathname.startsWith('/workspace/new')
  return isPublic ? <>{children}</> : <AuthGuard>{children}</AuthGuard>
}
