import React, { useEffect, useRef } from 'react'
import { type FC } from 'react'
import { MessageItem } from './MessageItem'

interface Message {
  role: 'user' | 'assistant'
  content: string | { type: string; source: string; [key: string]: unknown }
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
}

export const MessageList: FC<MessageListProps> = ({
  messages,
  isLoading,
  onWidgetCallback
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages, isLoading])

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {messages.length === 0 && !isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
          fontSize: '14px'
        }}>
          Start a conversation...
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <MessageItem
              key={index}
              message={message}
              onWidgetCallback={onWidgetCallback}
            />
          ))}
          {isLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%'
            }}>
              <div style={{
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ccc',
                  borderTop: '2px solid #007bff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Thinking...
              </div>
            </div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
