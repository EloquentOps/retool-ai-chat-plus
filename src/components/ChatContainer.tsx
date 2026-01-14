import React, { useState, useEffect } from 'react'
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
  componentPreferences?: Record<string, unknown>
  onHistoryUpdate?: (updatedHistory: Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean; blockId?: number; blockIndex?: number; blockTotal?: number }>) => void
  promotedWidgets?: Record<string, unknown>
}

interface PinnedWidget {
  widgetContent: { type: string; source?: string; [key: string]: unknown }
  widgetType: string
  historyIndex: number
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
  componentPreferences = {},
  onHistoryUpdate
  ,
  promotedWidgets
}) => {
  const hasWelcomeContent = welcomeMessage || (promptChips && promptChips.length > 0)
  const isEmpty = messages.filter(message => !message.hidden).length === 0 && !isLoading && hasWelcomeContent

  // State for pinned widgets in right panel (array to support multiple)
  const [pinnedWidgets, setPinnedWidgets] = useState<PinnedWidget[]>([])
  const [activePinnedTab, setActivePinnedTab] = useState<number>(0)

  // Extract preferences from componentPreferences
  const wrapperBorder = componentPreferences.wrapperBorder
  const isBorderHidden = wrapperBorder === 'hidden'
  const lockUI = componentPreferences.lockUI === true // Default to false if not set
  const hideWidgetFooter = componentPreferences.hideWidgetFooter === true // Default to false if not set

  // Function to update history with pinned state changes
  const updateHistoryWithPinnedState = (historyIndex: number, pinned: boolean) => {
    if (historyIndex < 0 || historyIndex >= messages.length) {
      return
    }

    const message = messages[historyIndex]
    if (message.role !== 'assistant' || typeof message.content === 'string') {
      return
    }

    const widgetContent = message.content as { type: string; source?: string; pinned?: boolean; [key: string]: unknown }
    const updatedContent = pinned
      ? { ...widgetContent, pinned: true }
      : (() => {
          const { pinned: _, ...rest } = widgetContent
          return rest
        })()

    const updatedMessages = [...messages]
    updatedMessages[historyIndex] = {
      ...message,
      content: updatedContent
    }

    // Notify parent to update history
    onHistoryUpdate?.(updatedMessages)
  }

  // Function to restore pinned widgets from history
  const restorePinnedWidgets = (historyMessages: typeof messages, preserveActiveTab: boolean = false) => {
    const pinned: PinnedWidget[] = []
    
    historyMessages.forEach((message, index) => {
      if (message.role === 'assistant' && typeof message.content === 'object' && message.content !== null) {
        const widgetContent = message.content as { type: string; source?: string; pinned?: boolean; [key: string]: unknown }
        if (widgetContent.pinned === true && widgetContent.type) {
          pinned.push({
            widgetContent: widgetContent,
            widgetType: widgetContent.type,
            historyIndex: index
          })
        }
      }
    })

    setPinnedWidgets(pinned)
    
    // Only update active tab if needed
    if (pinned.length > 0) {
      if (preserveActiveTab) {
        // Preserve the current active tab if it still exists, otherwise adjust
        setActivePinnedTab(prev => {
          if (prev < pinned.length) {
            return prev // Keep current selection if still valid
          } else {
            return pinned.length - 1 // Adjust if out of bounds
          }
        })
      } else {
        // Only reset to 0 when not preserving (e.g., initial load)
        setActivePinnedTab(0)
      }
    } else {
      setActivePinnedTab(0)
    }
  }

  // Restore pinned widgets when messages change (e.g., on history restore)
  // Preserve active tab selection when messages update during chat interactions
  useEffect(() => {
    restorePinnedWidgets(messages, true)
  }, [messages])

  // Handler for widget pin/unpin actions
  const handleWidgetCallback = (payload: Record<string, unknown>) => {
    // Handle pin action
    if (payload.type === 'widget:pin') {
      const widgetContent = payload.widgetContent as { type: string; source?: string; [key: string]: unknown }
      const widgetType = payload.widgetType as string
      const historyIndex = payload.messageIndex as number | undefined

      if (widgetContent && widgetType && typeof historyIndex === 'number') {
        // Check if widget is already pinned
        const isAlreadyPinned = pinnedWidgets.some(pw => pw.historyIndex === historyIndex)
        
        if (!isAlreadyPinned) {
          // Add pinned:true to widget content in history
          updateHistoryWithPinnedState(historyIndex, true)
          
          // Add to pinned widgets array
          const newPinnedWidget: PinnedWidget = {
            widgetContent: { ...widgetContent, pinned: true },
            widgetType: widgetType,
            historyIndex: historyIndex
          }
          setPinnedWidgets(prev => [...prev, newPinnedWidget])
          setActivePinnedTab(pinnedWidgets.length) // Switch to new tab
        }
      }
      // Don't forward pin actions to parent callback
      return
    }

    // Handle unpin action
    if (payload.type === 'widget:unpin') {
      const historyIndex = payload.historyIndex as number | undefined
      
      if (typeof historyIndex === 'number') {
        // Remove pinned:true from widget content in history
        updateHistoryWithPinnedState(historyIndex, false)
        
        // Remove from pinned widgets array
        const updatedPinned = pinnedWidgets.filter(pw => pw.historyIndex !== historyIndex)
        setPinnedWidgets(updatedPinned)
        
        // Adjust active tab if needed
        if (updatedPinned.length === 0) {
          setActivePinnedTab(0)
        } else if (activePinnedTab >= updatedPinned.length) {
          setActivePinnedTab(updatedPinned.length - 1)
        }
      }
      return
    }
    
    // Forward all other callbacks to parent
    onWidgetCallback?.(payload)
  }

  // Handler for tab change
  const handleTabChange = (tabIndex: number) => {
    setActivePinnedTab(tabIndex)
  }

  // Handler for tab close
  const handleTabClose = (historyIndex: number) => {
    handleWidgetCallback({
      type: 'widget:unpin',
      historyIndex: historyIndex
    })
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
              lockUI={lockUI}
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
                  if (lockUI) {
                    return // Don't execute if UI is locked
                  }
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
                    disabled={lockUI}
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
                    cursor: lockUI ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    opacity: lockUI ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!lockUI) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!lockUI) {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }
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
          {pinnedWidgets.length > 0 ? (
            // Split layout when widgets are pinned
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
                <MessageList messages={messages} isLoading={isLoading} onWidgetCallback={handleWidgetCallback} widgetsOptions={widgetsOptions} lockUI={lockUI} hideWidgetFooter={hideWidgetFooter} promotedWidgets={promotedWidgets} />
                <MentionsInputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} onStop={onStop} isCentered={false} widgetsOptions={widgetsOptions} tools={tools} placeholder={placeholder} lockUI={lockUI} />
              </div>
              
              {/* Right panel - Pinned widgets with tabs */}
              <RightPanel
                pinnedWidgets={pinnedWidgets}
                activeTab={activePinnedTab}
                onTabChange={handleTabChange}
                onTabClose={handleTabClose}
                onWidgetCallback={handleWidgetCallback}
                widgetsOptions={widgetsOptions}
                lockUI={lockUI}
                hideWidgetFooter={hideWidgetFooter}
                promotedWidgets={promotedWidgets}
              />
            </div>
          ) : (
            // Full width layout when no widget is pinned
            <>
              <MessageList messages={messages} isLoading={isLoading} onWidgetCallback={handleWidgetCallback} widgetsOptions={widgetsOptions} lockUI={lockUI} hideWidgetFooter={hideWidgetFooter} promotedWidgets={promotedWidgets} />
              <MentionsInputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} onStop={onStop} isCentered={false} widgetsOptions={widgetsOptions} tools={tools} placeholder={placeholder} lockUI={lockUI} />
            </>
          )}
        </>
      )}
    </div>
  )
}
