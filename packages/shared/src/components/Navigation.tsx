'use client'

import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

type NavigationLink = {
  href: string
  label: string
}

type NavigationProps = {
  links: NavigationLink[]
  title?: string
}

export function Navigation({ links, title = "Help Desk" }: NavigationProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  if (!user) return null

  return (
    <aside className="w-64 bg-gray-50 border-r flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="text-xl font-semibold">
          {title}
        </Link>
      </div>
      <nav className="p-4 flex-1">
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
      <div className="p-4 border-t">
        <button
          onClick={signOut}
          className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </button>
      </div>
    </aside>
  )
} 