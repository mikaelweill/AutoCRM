'use client'

import * as React from "react"
import { Button, Input, ScrollArea } from "./ui"
import { cn } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"
import { hasRequiredRole } from "../auth/utils"
import { Send } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "agent" | "assistant"
  created_at: string
  isTyping?: boolean  // Add this for typing indicator
  success?: boolean   // Store feedback result
}

interface ChatWindowProps {
  className?: string
}

// Add this new component before the ChatWindow component
const TypingIndicator = () => (
  <div className="flex space-x-2 p-3 bg-muted rounded-2xl rounded-tl-sm max-w-[85%] h-8">
    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
  </div>
)

// Add FeedbackRequest component
const FeedbackRequest: React.FC<{ onFeedback: (success: boolean) => void }> = ({ onFeedback }) => (
  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
    <span>Was this action successful?</span>
    <button onClick={() => onFeedback(true)} className="hover:text-green-600">✅ Yes</button>
    <button onClick={() => onFeedback(false)} className="hover:text-red-600">❌ No</button>
  </div>
)

export function ChatWindow({ className }: ChatWindowProps) {
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = React.useState(false)  // Start closed
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [toolUsedMessages, setToolUsedMessages] = React.useState<Set<string>>(new Set()) // Track which messages used tools
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const submissionTimeRef = React.useRef<number>(0)

  // Fetch messages on mount
  React.useEffect(() => {
    if (!user || !hasRequiredRole(user, 'agent')) return

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
  }, [user])

  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages])

  // New effect to scroll when chat is opened
  React.useEffect(() => {
    if (isOpen && scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'auto' // Use instant scroll on open
      });
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent duplicate submissions within 1 second
    const now = Date.now()
    if (now - submissionTimeRef.current < 1000) {
      return
    }
    submissionTimeRef.current = now
    
    if (!input.trim() || isSending) return

    setIsSending(true)
    const messageContent = input.trim()  // Capture the input value
    setInput("")  // Clear input immediately
    
    try {
      // Add a temporary typing message
      const tempTypingMessage: Message = {
        id: 'typing',
        content: '',
        sender: 'assistant',
        created_at: new Date().toISOString(),
        isTyping: true
      }
      
      // First add the user's message to the UI immediately
      const userMessage: Message = {
        id: 'pending',
        content: messageContent,
        sender: 'agent',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage, tempTypingMessage])

      const response = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const { messages: [savedUserMessage, assistantMessage], toolsUsed } = await response.json()
      
      // Replace the pending messages with the saved ones
      setMessages(prev => 
        prev
          .filter(m => m.id !== 'pending' && m.id !== 'typing')
          .concat([savedUserMessage, assistantMessage])
      )

      // If tools were used, add the message to toolUsedMessages
      if (toolsUsed) {
        setToolUsedMessages(prev => new Set(prev).add(assistantMessage.id))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove typing indicator and pending message on error
      setMessages(prev => prev.filter(m => m.id !== 'typing' && m.id !== 'pending'))
    } finally {
      setIsSending(false)
    }
  }

  const handleFeedback = async (messageId: string, success: boolean) => {
    try {
      const response = await fetch(`/api/chat-messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success })
      })
      
      if (!response.ok) throw new Error('Failed to save feedback')
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, success } : msg
        )
      )
      
      // Remove from tool used messages since feedback was given
      setToolUsedMessages(prev => {
        const next = new Set(prev)
        next.delete(messageId)
        return next
      })
    } catch (error) {
      console.error('Error saving feedback:', error)
    }
  }

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

  // Don't render anything if not authenticated or not an agent
  if (loading || !user || !hasRequiredRole(user, 'agent')) {
    return null
  }

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 w-[450px] bg-white border rounded-lg shadow-xl transition-all duration-200",
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
                  {message.isTyping ? (
                    <TypingIndicator />
                  ) : (
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
                  )}
                  <span className="text-xs text-muted-foreground/75 px-2">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {toolUsedMessages.has(message.id) && !message.success && (
                    <FeedbackRequest onFeedback={(success) => handleFeedback(message.id, success)} />
                  )}
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
                disabled={!input.trim() || isSending}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
} 