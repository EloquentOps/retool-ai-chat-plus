import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import { TextWidget, renderWidget } from './widgets'

// Regex to match @[display](id), #[display](id), and /[display](id) for splitting
const MENTION_SPLIT_REGEX = /(@\[[^\]]+\]\([^)]+\)|#\[[^\]]+\]\([^)]+\)|\/\[[^\]]+\]\([^)]+\))/g
const AT_MENTION_REGEX = /^@\[([^\]]+)\]\([^)]+\)$/
const HASH_MENTION_REGEX = /^#\[([^\]]+)\]\([^)]+\)$/
const SLASH_MENTION_REGEX = /^\/\[([^\]]+)\]\([^)]+\)$/

const PILL_AT_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(49, 112, 249, 0.14)',
  color: '#2563eb',
  fontWeight: 600,
  padding: '2px 8px',
  marginLeft: '4px',
  marginRight: '4px',
  borderRadius: '9999px',
  border: '1px solid rgba(37, 99, 235, 0.4)',
  display: 'inline'
}

const PILL_HASH_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(139, 92, 246, 0.14)',
  color: '#6d28d9',
  fontWeight: 600,
  padding: '2px 8px',
  marginLeft: '4px',
  marginRight: '4px',
  borderRadius: '9999px',
  border: '1px solid rgba(109, 40, 217, 0.4)',
  display: 'inline'
}

const PILL_SLASH_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(16, 185, 129, 0.14)',
  color: '#059669',
  fontWeight: 600,
  padding: '2px 8px',
  marginLeft: '4px',
  marginRight: '4px',
  borderRadius: '9999px',
  border: '1px solid rgba(5, 150, 105, 0.4)',
  display: 'inline'
}

// Inline markdown so segments flow with pill tags (no block <p>)
const INLINE_MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>
}

/** Renders user message content with @ and # mentions as coloured pill tags */
function renderUserMessageContent(content: string): React.ReactNode {
  const segments = content.split(MENTION_SPLIT_REGEX)
  return (
    <span style={{ display: 'inline' }}>
      {segments.map((segment, i) => {
        const atMatch = segment.match(AT_MENTION_REGEX)
        if (atMatch) {
          return (
            <span key={i} style={PILL_AT_STYLE}>
              @{atMatch[1]}
            </span>
          )
        }
        const hashMatch = segment.match(HASH_MENTION_REGEX)
        if (hashMatch) {
          return (
            <span key={i} style={PILL_HASH_STYLE}>
              #{hashMatch[1]}
            </span>
          )
        }
        const slashMatch = segment.match(SLASH_MENTION_REGEX)
        if (slashMatch) {
          return (
            <span key={i} style={PILL_SLASH_STYLE}>
              /{slashMatch[1]}
            </span>
          )
        }
        return (
          <ReactMarkdown key={i} components={INLINE_MARKDOWN_COMPONENTS}>
            {segment}
          </ReactMarkdown>
        )
      })}
    </span>
  )
}

import type { MessageWithTrace } from '../types/message'

interface Message extends MessageWithTrace {}

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
            ? renderUserMessageContent(message.content)
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
