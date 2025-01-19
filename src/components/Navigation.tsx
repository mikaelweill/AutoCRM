'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const { user } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const links = [
    { href: '/tickets', label: 'Tickets' },
    { href: '/knowledge-base', label: 'Knowledge Base' },
    { href: '/reports', label: 'Reports' },
  ]

  if (!user) return null

  return (
    <aside className="w-64 bg-gray-50 border-r h-screen">
      <div className="p-4 border-b">
        <Link href="/" className="text-xl font-semibold">
          Help Desk
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(href)
                    ? 'bg-gray-200 text-gray-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
} 