import { RootLayout } from 'shared'
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
  return <RootLayout>{children}</RootLayout>
} 