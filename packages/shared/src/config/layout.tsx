import { Inter } from 'next/font/google'

export const inter = Inter({ subsets: ['latin'] })

export const createMetadata = (title: string, description: string) => ({
  title,
  description,
}) 