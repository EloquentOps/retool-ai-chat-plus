import React from 'react'
import { type FC } from 'react'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'

interface ChatContainerProps {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string | { type: string; source: string; [key: string]: unknown }
  }>
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  onStop?: () => void
  promptChips?: Array<{
    icon: string
    label: string
    question: string
  }>
}

export const ChatContainer: FC<ChatContainerProps> = ({
  messages,
  onSubmitQuery,
  isLoading,
  onWidgetCallback,
  onStop,
  promptChips = []
}) => {
  const isEmpty = messages.length === 0 && !isLoading

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100% - 3px)',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: isEmpty ? '#f5f5f5' : '#ffffff',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {isEmpty ? (
        // Empty state with centered input
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 20px',
          gap: '40px'
        }}>
          {/* Welcome message */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '18px',
            color: '#374151',
            fontWeight: '400'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              ✨
            </div>
            <span>Hi there, how can I help you today?</span>
          </div>

          {/* Centered input bar */}
          <div style={{ width: '100%', maxWidth: '720px' }}>
            <InputBar 
              onSubmitQuery={onSubmitQuery} 
              isLoading={isLoading} 
              onStop={onStop}
              isCentered={true}
            />
          </div>

          {/* Suggested action chips */}
          {promptChips.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              maxWidth: '600px'
            }}>
              {promptChips.map((chip, index) => (
                <button
                  key={index}
                  onClick={() => onSubmitQuery(chip.question)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '24px',
                    fontSize: '14px',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                    e.currentTarget.style.borderColor = '#d1d5db'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Normal chat state
        <>
          <MessageList messages={messages} isLoading={isLoading} onWidgetCallback={onWidgetCallback} />
          <InputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} onStop={onStop} isCentered={false} />
        </>
      )}
    </div>
  )
}
