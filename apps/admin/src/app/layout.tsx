import { AuthProvider } from 'shared'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AutoCRM Admin Portal',
  description: 'Admin portal for AutoCRM',
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider appType="admin">
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 