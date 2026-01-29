import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import { TextWidget, renderWidget } from './widgets'

// Function to process special mention patterns like @[Image](image) to @Image in bold
const processSpecialMentions = (text: string): string => {
  // Match patterns like @[WidgetName](widget_type) and replace with **@WidgetName**
  let processed = text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '**@$1**')
  // Match patterns like #[Label](id) and replace with **#Label**
  processed = processed.replace(/#\[([^\]]+)\]\([^)]+\)/g, '**#$1**')
  return processed
}

interface Message {
  role: 'user' | 'assistant'
  content: string | { type: string; source?: string; [key: string]: unknown }
  hidden?: boolean // Optional flag to hide messages from display
  blockId?: number // ID of the block this message belongs to
  blockIndex?: number // Index within the block (0-based)
  blockTotal?: number // Total widgets in the block
}

interface MessageItemProps {
  message: Message
  messageIndex: number
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  lockUI?: boolean
  hideWidgetFooter?: boolean
}

export const MessageItem: FC<MessageItemProps> = ({
  message,
  messageIndex,
  onWidgetCallback,
  widgetsOptions,
  lockUI = false,
  hideWidgetFooter = false
}) => {
  const isUser = message.role === 'user'

  // Check if this is a pinned widget
  const isPinnedWidget = !isUser && 
    typeof message.content === 'object' && 
    message.content !== null &&
    'pinned' in message.content &&
    (message.content as { pinned?: boolean }).pinned === true

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
      ) : isPinnedWidget ? (
        // Show banner for pinned widgets
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0369a1',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a6 6 0 0 0-6-6v0a6 6 0 0 0-6 6v3.76Z" />
          </svg>
          <span style={{ fontWeight: 500 }}>
            This widget has been pinned to the right panel
          </span>
        </div>
      ) : (
        typeof message.content === 'string' 
          ? <TextWidget source={message.content} />
          : renderWidget(message.content as { type: string; source?: string; [key: string]: unknown }, onWidgetCallback, widgetsOptions, messageIndex, lockUI, hideWidgetFooter)
      )}
    </div>
  )
}
