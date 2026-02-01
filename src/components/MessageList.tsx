import React, { useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import { MessageItem } from './MessageItem'
import type { MessageWithTrace, TraceStep } from '../types/message'

interface Message extends MessageWithTrace {}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, any>
  lockUI?: boolean
  hideWidgetFooter?: boolean
}

const STEP_TYPE_LABELS: Record<string, string> = {
  agent_start: 'Agent started',
  llm_start: 'LLM turn started',
  llm_end: 'LLM turn ended',
  tool_waiting: 'Tool pending approval',
  tool_approved: 'Tool approved',
  tool_start: 'Tool execution started',
  tool_end: 'Tool finished',
  agent_end: 'Agent finished'
}

function getStepLabel(step: TraceStep): string {
  return step.toolUseReasoningSummary ?? STEP_TYPE_LABELS[step.type] ?? step.type
}

const REASONING_PREVIEW_LENGTH = 120

const TraceStepsSection: FC<{
  steps: TraceStep[]
  blockKey: string
  stepsPanelOpen: Record<string, boolean>
  setStepsPanelOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  expandedStepIds: Set<string>
  setExpandedStepIds: React.Dispatch<React.SetStateAction<Set<string>>>
}> = ({ steps, blockKey, stepsPanelOpen, setStepsPanelOpen, expandedStepIds, setExpandedStepIds }) => {
  const isOpen = stepsPanelOpen[blockKey] ?? false
  const togglePanel = () => setStepsPanelOpen(prev => ({ ...prev, [blockKey]: !prev[blockKey] }))
  const toggleStep = (id: string) => setExpandedStepIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  // Auto-expand steps that have thinking/reasoning when the panel is opened so users can inspect them
  useEffect(() => {
    if (isOpen && steps.length > 0) {
      const idsWithReasoning = steps.filter(s => s.toolUseReasoning).map(s => s.id)
      if (idsWithReasoning.length > 0) {
        setExpandedStepIds(prev => {
          const next = new Set(prev)
          idsWithReasoning.forEach(id => next.add(id))
          return next
        })
      }
    }
  }, [isOpen, blockKey]) // eslint-disable-line react-hooks/exhaustive-deps -- only when panel opens for this block

  return (
    <div style={{ width: '100%', marginTop: '8px' }}>
      <button
        type="button"
        onClick={togglePanel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          fontSize: '13px',
          color: '#0369a1',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        <span style={{ transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
        <span>Steps & reasoning ({steps.length})</span>
      </button>
      {isOpen && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {steps.map((step) => {
            const isStepExpanded = expandedStepIds.has(step.id)
            const label = getStepLabel(step)
            const hasReasoning = !!step.toolUseReasoning
            const hasParamsOrResult = !!((step.toolParameters && Object.keys(step.toolParameters).length > 0) || step.toolExecutionResult !== undefined)
            const hasDetails = hasReasoning || hasParamsOrResult
            const reasoningPreview = hasReasoning && step.toolUseReasoning
              ? (step.toolUseReasoning.length <= REASONING_PREVIEW_LENGTH
                  ? step.toolUseReasoning
                  : step.toolUseReasoning.slice(0, REASONING_PREVIEW_LENGTH) + '…')
              : null
            return (
              <div
                key={step.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  fontSize: '13px',
                  background: '#fafafa'
                }}
              >
                <button
                  type="button"
                  onClick={() => hasDetails && toggleStep(step.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '4px',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: hasDetails ? 'pointer' : 'default',
                    fontFamily: 'inherit'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ transform: isStepExpanded ? 'rotate(90deg)' : 'none', display: hasDetails ? 'inline-block' : 'none', transition: 'transform 0.15s', color: '#6b7280' }}>▶</span>
                    <span style={{ color: '#6b7280', flexShrink: 0 }}>{step.type}</span>
                    <span style={{ color: '#111', flex: 1 }}>{label}</span>
                  </div>
                  {reasoningPreview && (
                    <div style={{ paddingLeft: hasDetails ? '24px' : 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280' }}>Thinking: </span>
                      {reasoningPreview}
                    </div>
                  )}
                </button>
                {isStepExpanded && hasDetails && (
                  <div style={{ padding: '10px 12px 12px 28px', borderTop: '1px solid #e5e7eb', color: '#374151' }}>
                    {step.toolUseReasoning && (
                      <div style={{ marginBottom: hasParamsOrResult ? '12px' : 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px', color: '#6b7280' }}>Thinking / reasoning</div>
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{step.toolUseReasoning}</div>
                      </div>
                    )}
                    {step.toolParameters && Object.keys(step.toolParameters).length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px', color: '#6b7280' }}>Parameters</div>
                        <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(step.toolParameters, null, 2)}</pre>
                      </div>
                    )}
                    {step.toolExecutionResult !== undefined && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px', color: '#6b7280' }}>Result</div>
                        <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{typeof step.toolExecutionResult === 'object' ? JSON.stringify(step.toolExecutionResult, null, 2) : String(step.toolExecutionResult)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const MessageList: FC<MessageListProps> = ({
  messages,
  isLoading,
  onWidgetCallback,
  widgetsOptions,
  lockUI = false,
  hideWidgetFooter = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [stepsPanelOpen, setStepsPanelOpen] = useState<Record<string, boolean>>({})
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set())

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
  
  // Don't forget the last block if it exists (type assertion: forEach mutates currentBlock so TS doesn't narrow after loop)
  const lastBlock = currentBlock as Message[] | null
  if (lastBlock && lastBlock.length > 0) {
    groupedMessages.push({ messages: lastBlock, isBlock: true })
  }

  // Scroll to bottom when messages change or loading state changes
  // Only auto-scroll when the number of visible messages or the
  // last visible message content actually changes (or loading state).
  // This avoids scrolling on unrelated re-renders (e.g., widget callbacks)
  const lastVisibleMessageContent = visibleMessages.length > 0
    ? JSON.stringify(visibleMessages[visibleMessages.length - 1].content)
    : null

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [visibleMessages.length, lastVisibleMessageContent, isLoading])

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
              const blockKey = `block-${group.messages[0]?.blockId ?? groupIndex}`
              const traceSteps = group.messages[0]?.traceSteps
              const hasTraceSteps = traceSteps && traceSteps.length > 0
              return (
                <div
                  key={blockKey}
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
                        key={`${blockKey}-${msgIndex}`}
                        message={message}
                        messageIndex={originalIndex}
                        onWidgetCallback={onWidgetCallback}
                        widgetsOptions={widgetsOptions}
                        lockUI={lockUI}
                        hideWidgetFooter={hideWidgetFooter}
                      />
                    )
                  })}
                  {hasTraceSteps && (
                    <TraceStepsSection
                      steps={traceSteps}
                      blockKey={blockKey}
                      stepsPanelOpen={stepsPanelOpen}
                      setStepsPanelOpen={setStepsPanelOpen}
                      expandedStepIds={expandedStepIds}
                      setExpandedStepIds={setExpandedStepIds}
                    />
                  )}
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
                  lockUI={lockUI}
                  hideWidgetFooter={hideWidgetFooter}
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