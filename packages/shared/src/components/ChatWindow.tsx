'use client'

import * as React from "react"
import { Button, Input, ScrollArea } from "./ui"
import { cn } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"
import { hasRequiredRole } from "../auth/utils"

interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  created_at: string
}

interface ChatWindowProps {
  className?: string
}

export function ChatWindow({ className }: ChatWindowProps) {
  const { user, loading } = useAuth()
  
  // Don't render anything if not authenticated or not an agent
  if (loading || !user || !hasRequiredRole(user, 'agent')) {
    return null
  }

  const [isOpen, setIsOpen] = React.useState(true)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const message = await response.json()
      setMessages(prev => [...prev, message])
      setInput("")
    } catch (error) {
      console.error('Error sending message:', error)
      // Could add error toast here
    } finally {
      setIsSending(false)
    }
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className={cn(
      "fixed bottom-4 right-4 w-[400px] bg-background border rounded-lg shadow-lg",
      !isOpen && "h-12 cursor-pointer",
      isOpen && "h-[600px]",
      className
    )}>
      <div 
        className="flex items-center justify-between p-4 border-b"
        onClick={() => !isOpen && setIsOpen(true)}
      >
        <h3 className="font-semibold">AI Assistant</h3>
        {isOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          >
            Minimize
          </Button>
        )}
      </div>

      {isOpen && (
        <>
          <ScrollArea className="flex-1 p-4 h-[calc(600px-8rem)]">
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-max max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.sender === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isSending}
              />
              <Button type="submit" size="sm" disabled={isSending}>
                {isSending ? "..." : "Send"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
} 