import { AuthProvider } from 'shared/src/contexts/AuthContext'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AutoCRM Client Portal',
  description: 'Client portal for AutoCRM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider appType="client">
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
