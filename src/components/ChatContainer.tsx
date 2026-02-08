import React, { useState, useEffect } from 'react'
import { type FC } from 'react'
import type { MessageWithTrace } from '../types/message'
import { MessageList } from './MessageList'
import { MentionsInputBar } from './MentionsInputBar'
import { ErrorMessage } from './ErrorMessage'
import { RightPanel } from './RightPanel'
import packageJson from '../../package.json'

interface ChatContainerProps {
  messages: Array<MessageWithTrace>
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  asyncMode?: boolean
  sessionAsyncLoading?: boolean
  currentThinkingSummary?: string | null
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
  sourcesOptions?: Array<{ id?: string; label: string; content?: string }>
  commandOptions?: Array<{ id: string; label: string }>
  welcomeMessage?: string
  error?: string | null
  onRetry?: () => void
  onDismissError?: () => void
  placeholder?: string
  componentPreferences?: Record<string, unknown>
  fillInput?: string
  onFillApplied?: () => void
  onHistoryUpdate?: (updatedHistory: Array<MessageWithTrace>) => void
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
  asyncMode = false,
  sessionAsyncLoading = false,
  currentThinkingSummary,
  onWidgetCallback,
  onStop,
  promptChips = [],
  onChipCallback,
  onSetChipPayload,
  widgetsOptions,
  tools,
  sourcesOptions,
  commandOptions,
  welcomeMessage,
  error,
  onRetry,
  onDismissError,
  placeholder,
  componentPreferences = {},
  fillInput,
  onFillApplied,
  onHistoryUpdate
}) => {
  // Extract preferences from componentPreferences (must be before effectiveLockUI)
  const wrapperBorder = componentPreferences.wrapperBorder
  const isBorderHidden = wrapperBorder === 'hidden'
  const lockUI = componentPreferences.lockUI === true // Default to false if not set
  const hideWidgetFooter = componentPreferences.hideWidgetFooter === true // Default to false if not set
  const showTraceSteps = !asyncMode && componentPreferences.showTraceSteps === true // Disabled in async mode; default false
  const welcomeViewHideSubmitBar = componentPreferences.welcomeViewHideSubmitBar === true // Default false; when true, hides submit bar in welcome view (chips only)

  const hasWelcomeContent = welcomeMessage || (promptChips && promptChips.length > 0)
  const isSessionLoading = asyncMode && sessionAsyncLoading
  const isEmpty = messages.filter(message => !message.hidden).length === 0 && !isLoading && !isSessionLoading && hasWelcomeContent
  const effectiveLockUI = lockUI || isSessionLoading

  // State for pinned widgets in right panel (array to support multiple)
  const [pinnedWidgets, setPinnedWidgets] = useState<PinnedWidget[]>([])
  const [activePinnedTab, setActivePinnedTab] = useState<number>(0)

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
      {/* Session loading banner - always at top, visible when user submits from any input bar */}
      {isSessionLoading && (
        <>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{
          flexShrink: 0,
          padding: '12px 16px',
          backgroundColor: '#e0f2fe',
          borderBottom: '1px solid #bae6fd',
          fontSize: '14px',
          color: '#0369a1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #bae6fd',
            borderTop: '2px solid #0369a1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Session is in progress
        </div>
        </>
      )}
      {isEmpty ? (
        // Empty state with centered input
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
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

          {/* Centered input bar - hidden when welcomeViewHideSubmitBar is true */}
          {!welcomeViewHideSubmitBar && (
            <div style={{ width: '100%', maxWidth: '720px' }}>
              <MentionsInputBar 
                onSubmitQuery={onSubmitQuery} 
                isLoading={asyncMode ? false : isLoading} 
                onStop={asyncMode ? undefined : onStop} 
                isCentered={true}
                widgetsOptions={widgetsOptions}
                tools={tools}
                sourcesOptions={sourcesOptions}
                commandOptions={commandOptions}
                placeholder={placeholder}
                lockUI={effectiveLockUI}
                fillInput={fillInput}
                onFillApplied={onFillApplied}
              />
            </div>
          )}

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
                  if (effectiveLockUI) {
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
                    disabled={effectiveLockUI}
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
                    cursor: effectiveLockUI ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    opacity: effectiveLockUI ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!effectiveLockUI) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!effectiveLockUI) {
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
            fontWeight: 400
          }}>
            <a
              href="https://github.com/EloquentOps/retool-ai-chat-plus"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              v{packageJson.version}
            </a>
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
                <MessageList messages={messages} isLoading={isLoading} asyncMode={asyncMode} sessionAsyncLoading={sessionAsyncLoading} currentThinkingSummary={currentThinkingSummary} onWidgetCallback={handleWidgetCallback} widgetsOptions={widgetsOptions} lockUI={effectiveLockUI} hideWidgetFooter={hideWidgetFooter} showTraceSteps={showTraceSteps} />
                <MentionsInputBar onSubmitQuery={onSubmitQuery} isLoading={asyncMode ? false : isLoading} onStop={asyncMode ? undefined : onStop} isCentered={false} widgetsOptions={widgetsOptions} tools={tools} sourcesOptions={sourcesOptions} commandOptions={commandOptions} placeholder={placeholder} lockUI={effectiveLockUI} fillInput={fillInput} onFillApplied={onFillApplied} />
              </div>
              
              {/* Right panel - Pinned widgets with tabs */}
              <RightPanel
                pinnedWidgets={pinnedWidgets}
                activeTab={activePinnedTab}
                onTabChange={handleTabChange}
                onTabClose={handleTabClose}
                onWidgetCallback={handleWidgetCallback}
                widgetsOptions={widgetsOptions}
                lockUI={effectiveLockUI}
                hideWidgetFooter={hideWidgetFooter}
              />
            </div>
          ) : (
            // Full width layout when no widget is pinned
            <>
              <MessageList messages={messages} isLoading={isLoading} asyncMode={asyncMode} sessionAsyncLoading={sessionAsyncLoading} onWidgetCallback={handleWidgetCallback} widgetsOptions={widgetsOptions} lockUI={effectiveLockUI} hideWidgetFooter={hideWidgetFooter} showTraceSteps={showTraceSteps} />
              <MentionsInputBar onSubmitQuery={onSubmitQuery} isLoading={asyncMode ? false : isLoading} onStop={asyncMode ? undefined : onStop} isCentered={false} widgetsOptions={widgetsOptions} tools={tools} sourcesOptions={sourcesOptions} commandOptions={commandOptions} placeholder={placeholder} lockUI={effectiveLockUI} fillInput={fillInput} onFillApplied={onFillApplied} />
            </>
          )}
        </>
      )}
    </div>
  )
}
