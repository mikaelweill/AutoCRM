'use client'

import * as React from "react"
import { Button, Input, ScrollArea } from "./ui"
import { cn } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"
import { hasRequiredRole } from "../auth/utils"

interface Message {
  id: string
  content: string
  sender: "agent" | "assistant"
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

  const [isOpen, setIsOpen] = React.useState(false)  // Start closed
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Fetch messages on mount
  React.useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/chat-messages')
        if (!response.ok) {
          throw new Error('Failed to fetch messages')
        }
        const data = await response.json()
        setMessages(data)
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }
    fetchMessages()
  }, [])

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
    } finally {
      setIsSending(false)
    }
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Separate components for better organization
  const Header = () => (
    <div className="flex items-center justify-between p-4 border-b bg-primary/5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"/>
        <h3 className="font-semibold text-lg">AI Assistant</h3>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-primary/10"
        onClick={() => setIsOpen(prev => !prev)}
      >
        {isOpen ? "Minimize" : "Open Chat"}
      </Button>
    </div>
  )

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 w-[450px] bg-background border rounded-lg shadow-xl transition-all duration-200",
        !isOpen ? "h-14" : "h-[600px]",
        className
      )}
    >
      <Header />

      {isOpen && (
        <>
          <ScrollArea className="flex-1 p-4 h-[calc(600px-8rem)]" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-1.5",
                    message.sender === "agent" ? "items-end" : "items-start"
                  )}
                >
                  <span className="text-sm font-medium text-muted-foreground px-2">
                    {message.sender === "agent" ? "You" : "AI Assistant"}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-relaxed shadow-sm",
                      message.sender === "agent"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                  <span className="text-xs text-muted-foreground/75 px-2">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-base shadow-sm"
                disabled={isSending}
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={isSending}
                className="text-base px-6 shadow-sm"
              >
                {isSending ? "..." : "Send"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
} 