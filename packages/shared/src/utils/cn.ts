type ClassValue = string | number | boolean | undefined | null
type ClassArray = ClassValue[]
type ClassDictionary = Record<string, any>

export function cn(...inputs: (ClassValue | ClassArray | ClassDictionary)[]) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim()
} 