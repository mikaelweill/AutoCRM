import React from 'react'
import { RootLayout } from 'shared'
import { AuthProvider } from 'shared'
import './globals.css'

export const metadata = {
  title: 'AutoCRM Agent Portal',
  description: 'Agent portal for AutoCRM',
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootLayout>
      <AuthProvider appType="agent">
        {children}
      </AuthProvider>
    </RootLayout>
  )
}
