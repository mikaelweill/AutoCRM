import React from 'react'
import { RootLayout } from 'shared'
import { AuthProvider } from 'shared'
import './globals.css'

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
    <RootLayout>
      <AuthProvider appType="admin">
        {children}
      </AuthProvider>
    </RootLayout>
  )
} 