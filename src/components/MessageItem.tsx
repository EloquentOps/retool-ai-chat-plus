import React from 'react'
import { type FC } from 'react'
import { TextWidget, renderWidget } from './widgets'

interface Message {
  role: 'user' | 'assistant'
  content: string | { type: string; source: string; [key: string]: unknown }
}

interface MessageItemProps {
  message: Message
  onWidgetCallback?: (payload: Record<string, unknown>) => void
}

export const MessageItem: FC<MessageItemProps> = ({
  message,
  onWidgetCallback
}) => {
  const isUser = message.role === 'user'

  // Use the centralized widget renderer - no need to maintain this function anymore!

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      width: '100%',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {isUser ? (
        <div style={{
          backgroundColor: '#eee',
          color: '#000',
          padding: '8px 16px',
          borderRadius: '18px',
          fontSize: '14px',
          lineHeight: '1.4',
          wordWrap: 'break-word',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
        </div>
      ) : (
        typeof message.content === 'string' 
          ? <TextWidget content={message.content} />
          : renderWidget(message.content, onWidgetCallback)
      )}
    </div>
  )
}
