'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const timer = setTimeout(() => {
      setHydrated(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/auth')
    }
  }, [hydrated, user, router])

  if (!hydrated) return null
  if (!user) return null

  return <>{children}</>
}
