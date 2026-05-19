import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/layout/ClientLayout'

export const metadata: Metadata = {
  title: 'GradFlow',
  description: 'Graduation Project Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
