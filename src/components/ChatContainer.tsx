import React, { useState } from 'react'
import { type FC } from 'react'
import { MessageList } from './MessageList'
import { MentionsInputBar } from './MentionsInputBar'
import { ErrorMessage } from './ErrorMessage'
import { RightPanel } from './RightPanel'
import packageJson from '../../package.json'

interface ChatContainerProps {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string | { type: string; source?: string; [key: string]: unknown }
    hidden?: boolean // Optional flag to hide messages from display
    blockId?: number // ID of the block this message belongs to
    blockIndex?: number // Index within the block (0-based)
    blockTotal?: number // Total widgets in the block
  }>
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  onStop?: () => void
  promptChips?: Array<{
    icon: string
    label: string
    question?: string
    payload?: Record<string, unknown>
  }>
  onChipCallback?: () => void
  onSetChipPayload?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  tools?: Record<string, { tool: string; description: string }>
  welcomeMessage?: string
  error?: string | null
  onRetry?: () => void
  onDismissError?: () => void
  placeholder?: string
  stylePreferences?: Record<string, unknown>
}

export const ChatContainer: FC<ChatContainerProps> = ({
  messages,
  onSubmitQuery,
  isLoading,
  onWidgetCallback,
  onStop,
  promptChips = [],
  onChipCallback,
  onSetChipPayload,
  widgetsOptions,
  tools,
  welcomeMessage,
  error,
  onRetry,
  onDismissError,
  placeholder,
  stylePreferences = {}
}) => {
  const hasWelcomeContent = welcomeMessage || (promptChips && promptChips.length > 0)
  const isEmpty = messages.filter(message => !message.hidden).length === 0 && !isLoading && hasWelcomeContent

  // State for pinned widget in right panel
  const [pinnedWidget, setPinnedWidget] = useState<{ type: string; source?: string; [key: string]: unknown } | null>(null)
  const [pinnedWidgetType, setPinnedWidgetType] = useState<string>('')

  // Determine wrapper border visibility based on stylePreferences
  const wrapperBorder = stylePreferences.wrapperBorder
  const isBorderHidden = wrapperBorder === 'hidden'

  // Handler for widget pin/unpin actions
  const handleWidgetCallback = (payload: Record<string, unknown>) => {
    // Handle pin action
    if (payload.type === 'widget:pin') {
      const widgetContent = payload.widgetContent as { type: string; source?: string; [key: string]: unknown }
      const widgetType = payload.widgetType as string
      if (widgetContent && widgetType) {
        setPinnedWidget(widgetContent)
        setPinnedWidgetType(widgetType)
      }
      // Don't forward pin actions to parent callback
      return
    }
    
    // Forward all other callbacks to parent
    onWidgetCallback?.(payload)
  }

  // Handler for closing right panel
  const handleCloseRightPanel = () => {
    setPinnedWidget(null)
    setPinnedWidgetType('')
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100% - 3px)',
      ...(isBorderHidden ? {} : { border: '1px solid #e0e0e0', borderRadius: '8px' }),
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
          gap: '40px',
          position: 'relative'
        }}>
          {/* Welcome message */}
          {welcomeMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '18px',
              color: '#374151',
              fontWeight: '400'
            }}>
              <span>{welcomeMessage}</span>
            </div>
          )}

          {/* Centered input bar */}
          <div style={{ width: '100%', maxWidth: '720px' }}>
            <MentionsInputBar 
              onSubmitQuery={onSubmitQuery} 
              isLoading={isLoading} 
              onStop={onStop} 
              isCentered={true}
              widgetsOptions={widgetsOptions}
              tools={tools}
              placeholder={placeholder}
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
              {promptChips.map((chip, index) => {
                const handleChipClick = () => {
                  if (chip.payload !== undefined) {
                    // Chip has payload - set chipPayload and trigger chipCallback
                    if (onSetChipPayload) {
                      onSetChipPayload(chip.payload)
                    }
                    if (onChipCallback) {
                      onChipCallback()
                    }
                  } else if (chip.question !== undefined) {
                    // Chip has question - trigger onSubmitQuery
                    onSubmitQuery(chip.question)
                  }
                }
                
                return (
                  <button
                    key={index}
                    onClick={handleChipClick}
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
                )
              })}
            </div>
          )}

          {/* Version number */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '20px',
            fontSize: '13px',
            color: '#374151',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            zIndex: 10,
            pointerEvents: 'none',
            userSelect: 'none',
            fontWeight: 400
          }}>
            v{packageJson.version}
          </div>
        </div>
      ) : (
        // Normal chat state
        <>
          {error && onRetry && onDismissError && (
            <ErrorMessage 
              error={error} 
              onRetry={onRetry} 
              onDismiss={onDismissError} 
            />
          )}
          {pinnedWidget ? (
            // Split layout when widget is pinned
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
              overflow: 'hidden',
              height: '100%'
            }}>
              {/* Left panel - Chat */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                width: '50%',
                height: '100%',
                overflow: 'hidden'
              }}>
                <MessageList messages={messages} isLoading={isLoading} onWidgetCallback={handleWidgetCallback} widgetsOptions={widgetsOptions} />
                <MentionsInputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} onStop={onStop} isCentered={false} widgetsOptions={widgetsOptions} tools={tools} placeholder={placeholder} />
              </div>
              
              {/* Right panel - Pinned widget */}
              <RightPanel
                pinnedWidget={pinnedWidget}
                widgetType={pinnedWidgetType}
                onClose={handleCloseRightPanel}
                onWidgetCallback={handleWidgetCallback}
                widgetsOptions={widgetsOptions}
              />
            </div>
          ) : (
            // Full width layout when no widget is pinned
            <>
              <MessageList messages={messages} isLoading={isLoading} onWidgetCallback={handleWidgetCallback} widgetsOptions={widgetsOptions} />
              <MentionsInputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} onStop={onStop} isCentered={false} widgetsOptions={widgetsOptions} tools={tools} placeholder={placeholder} />
            </>
          )}
        </>
      )}
    </div>
  )
}
