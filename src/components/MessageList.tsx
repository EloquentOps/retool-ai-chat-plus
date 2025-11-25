import React, { useEffect, useRef } from 'react'
import { type FC } from 'react'
import { MessageItem } from './MessageItem'

interface Message {
  role: 'user' | 'assistant'
  content: string | { type: string; source?: string; [key: string]: unknown }
  hidden?: boolean // Optional flag to hide messages from display
  blockId?: number // ID of the block this message belongs to
  blockIndex?: number // Index within the block (0-based)
  blockTotal?: number // Total widgets in the block
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, any>
}

export const MessageList: FC<MessageListProps> = ({
  messages,
  isLoading,
  onWidgetCallback,
  widgetsOptions
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Filter out hidden messages for display
  const visibleMessages = messages.filter(message => !message.hidden)

  // Group consecutive assistant messages with the same blockId together
  const groupedMessages: Array<{ messages: Message[]; isBlock: boolean }> = []
  let currentBlock: Message[] | null = null
  
  visibleMessages.forEach((message, index) => {
    if (message.role === 'assistant' && message.blockId !== undefined) {
      // This is part of a widget block
      if (currentBlock === null || currentBlock[0]?.blockId !== message.blockId) {
        // Start a new block
        if (currentBlock !== null && currentBlock.length > 0) {
          groupedMessages.push({ messages: currentBlock, isBlock: true })
        }
        currentBlock = [message]
      } else {
        // Continue current block
        currentBlock.push(message)
      }
    } else {
      // This is not part of a block (user message or assistant without blockId)
      if (currentBlock !== null && currentBlock.length > 0) {
        groupedMessages.push({ messages: currentBlock, isBlock: true })
        currentBlock = null
      }
      groupedMessages.push({ messages: [message], isBlock: false })
    }
  })
  
  // Don't forget the last block if it exists
  if (currentBlock !== null && currentBlock.length > 0) {
    groupedMessages.push({ messages: currentBlock, isBlock: true })
  }

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [visibleMessages, isLoading])

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
      {visibleMessages.length === 0 && !isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
          fontSize: '14px'
        }}>
          
        </div>
      ) : (
        <>
          {groupedMessages.map((group, groupIndex) => {
            if (group.isBlock) {
              // Render widgets in a block together
              return (
                <div
                  key={`block-${group.messages[0]?.blockId || groupIndex}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    gap: '4px' // Reduced spacing between widgets in same block
                  }}
                >
                  {group.messages.map((message, msgIndex) => {
                    const originalIndex = visibleMessages.indexOf(message)
                    return (
                      <MessageItem
                        key={`block-${group.messages[0]?.blockId || groupIndex}-${msgIndex}`}
                        message={message}
                        messageIndex={originalIndex}
                        onWidgetCallback={onWidgetCallback}
                        widgetsOptions={widgetsOptions}
                      />
                    )
                  })}
                </div>
              )
            } else {
              // Render single message normally
              const message = group.messages[0]
              const originalIndex = visibleMessages.indexOf(message)
              return (
                <MessageItem
                  key={`single-${originalIndex}`}
                  message={message}
                  messageIndex={originalIndex}
                  onWidgetCallback={onWidgetCallback}
                  widgetsOptions={widgetsOptions}
                />
              )
            }
          })}
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
