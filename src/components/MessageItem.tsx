import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import { TextWidget, renderWidget } from './widgets'

// Function to process special mention patterns like @[Image](image) to @Image in bold
const processSpecialMentions = (text: string): string => {
  // Match patterns like @[WidgetName](widget_type) and replace with **@WidgetName**
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '**@$1**')
}

interface Message {
  role: 'user' | 'assistant'
  content: string | { type: string; source?: string; [key: string]: unknown }
  hidden?: boolean // Optional flag to hide messages from display
}

interface MessageItemProps {
  message: Message
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

export const MessageItem: FC<MessageItemProps> = ({
  message,
  onWidgetCallback,
  widgetsOptions
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
          {typeof message.content === 'string' 
            ? <ReactMarkdown>{processSpecialMentions(message.content)}</ReactMarkdown>
            : JSON.stringify(message.content)
          }
        </div>
      ) : (
        typeof message.content === 'string' 
          ? <TextWidget source={message.content} />
          : renderWidget(message.content as { type: string; source?: string; [key: string]: unknown }, onWidgetCallback, widgetsOptions)
      )}
    </div>
  )
}
