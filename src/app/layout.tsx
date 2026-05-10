import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/layout/ClientLayout'

export const metadata: Metadata = {
  title: 'GradFlow',
  description: 'Graduation project management tool',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-full flex flex-col"
        style={{ background: 'var(--bg)', fontFamily: 'var(--font-body)' }}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
