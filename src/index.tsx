import React, { useRef, useState, useEffect } from 'react'
import { type FC } from 'react'

import { Retool } from '@tryretool/custom-component-support'
import { ChatContainer } from './components'
import { ApprovalModal } from './components/ApprovalModal'
import { getAllWidgetInstructions } from './components/widgets'

export const AiChatPlus: FC = () => {
  // Add state for welcome message
  const [welcomeMessage, _setWelcomeMessage] = Retool.useStateString({
    name: 'welcomeMessage',
    initialValue: ''
  })


  // Add state to receive query responses
  const [queryResponse, _setQueryResponse] = Retool.useStateObject({
    name: 'queryResponse',
    initialValue: {}
  })


  // Add state for prompt chips
  const [promptChips, _setPromptChips] = Retool.useStateArray({
    name: 'promptChips',
    initialValue: []
  })

  // Add state for widget options
  const [widgetsOptions, _setWidgetsOptions] = Retool.useStateObject({
    name: 'widgetsOptions',
    initialValue: {}
  })

  

  const [history, _setHistory] = Retool.useStateArray({
    name: 'history',
    initialValue: []
  })


  const [_agentInputs, _setAgentInputs] = Retool.useStateObject({
    name: 'agentInputs',
    initialValue: {}
  })

  // Add state for widget payload
  const [_widgetPayload, _setWidgetPayload] = Retool.useStateObject({
    name: 'widgetPayload',
    initialValue: {}
  })

  // Add state for submit with payload
  const [submitWithPayload, _setSubmitWithPayload] = Retool.useStateObject({
    name: 'submitWithPayload',
    initialValue: {}
  })

  // Ref to track polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Ref to track previous submitWithPayload value to prevent multiple triggers
  const previousSubmitWithPayloadRef = useRef<Record<string, unknown>>({})
  
  // Local state for loading, error, and current agentRunId
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null)
  const [toolInfo, setToolInfo] = useState<{
    toolName: string
    toolDescription: string
    toolParameters: Record<string, unknown>
    toolUseReasoning: string
    toolUseReasoningSummary: string
    toolExecutionId: string
    toolId: string
  } | null>(null)
  const currentAgentIdRef = useRef<string | null>(null)
  const currentAgentRunIdRef = useRef<string | null>(null)
  
  // Track seen tool execution IDs to prevent duplicate approval modals
  const seenToolExecutionIdsRef = useRef<Set<string>>(new Set())
  const lastLogUUIDRef = useRef<string | null>(null)

  // Ensure internal state variables are always empty objects on mount
  useEffect(() => {
    // Force reset to empty objects to override any user configuration
    _setAgentInputs({})
    _setWidgetPayload({})
  }, [])

  // Monitor submitWithPayload changes
  useEffect(() => {
    // Check if submitWithPayload has actually changed
    const currentValue = submitWithPayload || {}
    const previousValue = previousSubmitWithPayloadRef.current

    console.log('submitWithPayload currentValue', currentValue)
    console.log('submitWithPayload previousValue', previousValue)
    
    // Deep comparison to check if values are different
    const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(previousValue)
    
    if (!hasChanged) return
    
    // Only proceed if there's actual content
    if (Object.keys(currentValue).length === 0) {
      // Update the ref even for empty values to track changes
      previousSubmitWithPayloadRef.current = { ...currentValue }
      return
    }

    const { action, messages } = currentValue as { 
      action?: string; 
      messages?: Array<{ role: 'user' | 'assistant'; content: string; hidden?: boolean }> 
    }

    console.log('submitWithPayload action detected:', action, 'messages:', messages)

    if (action === 'submit' && messages && Array.isArray(messages) && messages.length > 0) {
      // Update the ref BEFORE processing to prevent re-triggers
      previousSubmitWithPayloadRef.current = { ...currentValue }
      
      // Process each message in the array
      console.log('Triggering submit with messages:', messages)
      
      // Add all messages to history
      const newMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.hidden && { hidden: msg.hidden })
      }))
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory([...history, ...newMessages] as any)
      
      // If there are user messages, trigger the last one for processing
      const userMessages = messages.filter(msg => msg.role === 'user')
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1]
        onSubmitQueryCallback(lastUserMessage.content)
      }
      
      // Reset the submitWithPayload to prevent repeated triggers
      setTimeout(() => {
        _setSubmitWithPayload({})
      }, 0)
    } else if (action === 'stop') {
      // Update the ref BEFORE processing to prevent re-triggers
      previousSubmitWithPayloadRef.current = { ...currentValue }
      
      // Stop the current submit/polling
      console.log('Triggering stop action')
      stopPolling()
      
      // Reset the submitWithPayload to prevent repeated triggers
      setTimeout(() => {
        _setSubmitWithPayload({})
      }, 0)
    } else if (action === 'inject' && messages && Array.isArray(messages) && messages.length > 0) {
      // Update the ref BEFORE processing to prevent re-triggers
      previousSubmitWithPayloadRef.current = { ...currentValue }
      
      // Inject multiple hidden messages for context
      console.log('Injecting hidden context messages:', messages)
      const hiddenMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        hidden: true // Flag to indicate these messages should not be displayed
      }))
      
      // Add the hidden messages to history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory([...history, ...hiddenMessages] as any)
      
      // Reset the submitWithPayload to prevent repeated triggers
      setTimeout(() => {
        _setSubmitWithPayload({})
      }, 0)
    } else if (action === 'restore' && messages && Array.isArray(messages) && messages.length > 0) {
      // Update the ref BEFORE processing to prevent re-triggers
      previousSubmitWithPayloadRef.current = { ...currentValue }
      
      // Restore history with the provided messages
      console.log('Restoring history with messages:', messages)
      const restoredMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.hidden && { hidden: msg.hidden })
      }))
      
      // Replace the entire history with the restored messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory(restoredMessages as any)
      
      // Reset the submitWithPayload to prevent repeated triggers
      setTimeout(() => {
        _setSubmitWithPayload({})
      }, 0)
    } else {
      console.log('Unknown action or missing messages:', action, messages)
      // Update the ref even for unknown actions
      previousSubmitWithPayloadRef.current = { ...currentValue }
    }
  }, [submitWithPayload])

  // events
  const onSubmitQuery = Retool.useEventCallback({ name: "submitQuery" })
  const onWidgetCallback = Retool.useEventCallback({ name: "widgetCallback" })

  // Polling function to check query status
  const startPolling = (agentRunId: string, agentId: string) => {
    console.log('Starting polling for agentRunId:', agentRunId)
    currentAgentRunIdRef.current = agentRunId
    currentAgentIdRef.current = agentId
    setIsLoading(true)
    setError(null) // Clear any previous errors
    // Reset deduplication tracking for new run
    seenToolExecutionIdsRef.current.clear()
    lastLogUUIDRef.current = null
    
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling tick, current agentRunId:', currentAgentRunIdRef.current, 'expected:', agentRunId)
      // Check if we're still polling the same agentRunId
      if (currentAgentRunIdRef.current === agentRunId) {
        try {
          const pollInput = {
            action: 'getLogs',
            agentRunId: agentRunId,
            ...(lastLogUUIDRef.current && { lastLogUUID: lastLogUUIDRef.current })
          }
          
          _setAgentInputs(pollInput)
          onSubmitQuery()
        } catch (err) {
          console.error('Error during polling:', err)
          const errorMessage = err instanceof Error ? err.message : 'An error occurred during polling'
          setError(errorMessage)
          stopPolling()
        }
      } else {
        console.log('Stopping polling - agentRunId mismatch')
        clearInterval(pollingIntervalRef.current!)
        pollingIntervalRef.current = null
      }
    }, 1000)
    console.log('Polling interval set:', pollingIntervalRef.current)
  }

  // Resume polling function that preserves deduplication state
  const resumePolling = (agentRunId: string, agentId: string) => {
    console.log('Resuming polling for agentRunId:', agentRunId)
    currentAgentRunIdRef.current = agentRunId
    currentAgentIdRef.current = agentId
    setIsLoading(true)
    setError(null) // Clear any previous errors
    // DON'T clear deduplication tracking - preserve seen toolExecutionIds
    
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling tick, current agentRunId:', currentAgentRunIdRef.current, 'expected:', agentRunId)
      // Check if we're still polling the same agentRunId
      if (currentAgentRunIdRef.current === agentRunId) {
        try {
          const pollInput = {
            action: 'getLogs',
            agentRunId: agentRunId,
            ...(lastLogUUIDRef.current && { lastLogUUID: lastLogUUIDRef.current })
          }
          
          _setAgentInputs(pollInput)
          onSubmitQuery()
        } catch (err) {
          console.error('Error during polling:', err)
          const errorMessage = err instanceof Error ? err.message : 'An error occurred during polling'
          setError(errorMessage)
          stopPolling()
        }
      } else {
        console.log('Stopping polling - agentRunId mismatch')
        clearInterval(pollingIntervalRef.current!)
        pollingIntervalRef.current = null
      }
    }, 1000)
    console.log('Polling interval set:', pollingIntervalRef.current)
  }

  const stopPolling = () => {
    console.log('stopPolling called')
    console.log('Current polling interval:', pollingIntervalRef.current)
    console.log('Current agent run ID:', currentAgentRunIdRef.current)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      console.log('Polling interval cleared')
    }
    //currentAgentRunIdRef.current = null
    setIsLoading(false)
    console.log('Loading state set to false')
  }

  // Monitor queryResponse for status changes using useEffect to prevent infinite loops
  useEffect(() => {
    if (!queryResponse || Object.keys(queryResponse).length === 0) return

    // Update pagination tracking
    if (queryResponse.pagination && typeof queryResponse.pagination === 'object' && queryResponse.pagination !== null) {
      const pagination = queryResponse.pagination as Record<string, unknown>
      if (typeof pagination.lastLogUUID === 'string') {
        lastLogUUIDRef.current = pagination.lastLogUUID
      }
    }

    // Handle error responses
    if (queryResponse.status === 'ERROR' || queryResponse.error) {
      let errorMessage = 'An error occurred while processing your request'
      
      // Extract error message from various error formats
      if (queryResponse.error) {
        if (typeof queryResponse.error === 'string') {
          errorMessage = queryResponse.error
        } else if (typeof queryResponse.error === 'object' && queryResponse.error !== null) {
          const errorObj = queryResponse.error as Record<string, unknown>
          // Handle structured error objects
          if (errorObj.message) {
            errorMessage = errorObj.message as string
          } else if (errorObj.payload && typeof errorObj.payload === 'object') {
            const payload = errorObj.payload as Record<string, unknown>
            errorMessage = Object.entries(payload).map(([key, value]) => `${key}: ${value}`).join('; ')
          } else {
            errorMessage = JSON.stringify(errorObj)
          }
        }
      } else if (queryResponse.message) {
        errorMessage = queryResponse.message as string
      }
      
      setError(errorMessage)
      stopPolling()
      return
    }

    // Handle PAUSED_WAITING_FOR_APPROVAL status
    if (queryResponse.status === 'PAUSED_WAITING_FOR_APPROVAL' && isLoading) {
      // Extract tool information from trace
      let toolInfo = null
      let toolReasoning = ''
      let toolParameters = {}
      let currentToolExecutionId = ''
      
      if (queryResponse.trace && Array.isArray(queryResponse.trace)) {
        const traceArray = queryResponse.trace as unknown[]
        
        // Look for TOOL_WAITING_FOR_APPROVAL span or LLM_END span with toolData
        const toolSpan = traceArray.find((span: unknown) => {
          const spanObj = span as Record<string, unknown>
          return spanObj.spanType === 'TOOL_WAITING_FOR_APPROVAL' || 
                 (spanObj.spanType === 'LLM_END' && spanObj.toolData)
        }) as Record<string, unknown> | undefined
        
        if (toolSpan?.toolData) {
          const toolData = toolSpan.toolData as Record<string, unknown>
          currentToolExecutionId = toolData.toolExecutionId as string
          
          toolInfo = {
            toolName: toolData.toolName as string,
            toolDescription: toolData.toolDescription as string,
            toolParameters: (toolData.toolParameters as Record<string, unknown>) || {},
            toolUseReasoning: (toolData.toolUseReasoning as string) || '',
            toolUseReasoningSummary: (toolData.toolUseReasoningSummary as string) || '',
            toolExecutionId: currentToolExecutionId,
            toolId: toolData.toolId as string
          }
          toolReasoning = (toolData.toolUseReasoning as string) || ''
          toolParameters = (toolData.toolParameters as Record<string, unknown>) || {}
        }
      }
      
      // Check if we've already shown this tool execution to prevent duplicate modals
      if (currentToolExecutionId && seenToolExecutionIdsRef.current.has(currentToolExecutionId)) {
        console.log('Already shown modal for toolExecutionId:', currentToolExecutionId, '- skipping duplicate')
        return
      }
      
      // Mark this tool execution as seen
      if (currentToolExecutionId) {
        seenToolExecutionIdsRef.current.add(currentToolExecutionId)
        console.log('Added toolExecutionId to seen set:', currentToolExecutionId)
      }
      
      stopPolling() // Stop polling but don't set error or complete
      
      // Extract approval message if provided
      const approvalMsg = queryResponse.approvalMessage || queryResponse.message || 
                          'This action requires approval before proceeding.'
      
      // Enhanced approval message with tool context
      let enhancedMessage = approvalMsg
      if (toolInfo) {
        enhancedMessage = `The AI wants to use the "${toolInfo.toolName}" tool:\n\n• Tool: ${toolInfo.toolDescription}\n\nWhy: ${toolInfo.toolUseReasoningSummary || toolReasoning || 'No specific reasoning provided'}\n\nParameters:\n${Object.entries(toolParameters).map(([key, value]) => `• ${key}: ${value}`).join('\n')}`
      }
      
      setApprovalMessage(enhancedMessage as string)
      setToolInfo(toolInfo)
      setShowApprovalModal(true)
      return
    }

    // Handle resume response after tool approval/denial - restart polling
    if (queryResponse.success === true && queryResponse.status === 'PENDING' && !isLoading && currentAgentRunIdRef.current) {
      console.log('Agent resume detected, resuming polling for:', queryResponse.agentRunId || currentAgentRunIdRef.current)
      resumePolling(queryResponse.agentRunId as string || currentAgentRunIdRef.current as string, 
                    queryResponse.effectiveAgentId as string || currentAgentIdRef.current as string)
      return
    }

    // Handle initial invoke response - get agent RunId and start polling
    if (queryResponse.agentRunId && queryResponse.status === 'PENDING' && !isLoading) {
      startPolling(queryResponse.agentRunId as string, queryResponse.agentId as string)
      return
    }

    // Handle completed response
    if (queryResponse.status === 'COMPLETED' && isLoading) {
      stopPolling()
      setError(null) // Clear any errors on successful completion
      
      // Extract AI response content
      const aiResponse = queryResponse.content || queryResponse.resultText
      if (aiResponse) {
        let parsedContent: string | { type: string; [key: string]: unknown }
        
        console.log('aiResponse')
        console.log(aiResponse)

        try {
          // Try to parse as JSON first
          const jsonResponse = JSON.parse(aiResponse as string)
          parsedContent = jsonResponse
        } catch {
          // If not JSON, treat as plain text
          parsedContent = { type: 'text', source: aiResponse as string }
        }
        
        const assistantMessage = {
          role: 'assistant' as const,
          content: parsedContent
        }

        console.log('parsedContent')
        console.log(parsedContent)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory([...history, assistantMessage] as any)
      }
    }
  }, [queryResponse, isLoading]) // Dependencies: only re-run when queryResponse or isLoading changes

  // Retry function to restart polling
  const retryPolling = () => {
    if (currentAgentRunIdRef.current && currentAgentIdRef.current) {
      console.log('Retrying polling for agentRunId:', currentAgentRunIdRef.current)
      setError(null)
      resumePolling(currentAgentRunIdRef.current as string, currentAgentIdRef.current as string)
    }
  }

  // Function to normalize message content for agent input
  // Handles both string content and widget objects
  const normalizeMessageForAgent = (message: { role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown } }) => {
    if (typeof message.content === 'string') {
      return message
    }
    
    // Handle widget objects - extract plain text representation for the agent
    const jsonContent = message.content as { type: string; source?: string; [key: string]: unknown }
    
    // If the object has a 'source' property, use it (standardized format)
    if (jsonContent.source && typeof jsonContent.source === 'string') {
      return {
        role: message.role,
        content: jsonContent.source
      }
    }
    
    // If the object doesn't have a 'source' property, it means the entire object IS the source data
    // Convert it to a string representation that the agent can understand
    // For widgets like Google Maps where the object itself contains the data (lat, lon, zoom, etc.)
    const widgetType = jsonContent.type || 'widget'
    const { type, ...widgetData } = jsonContent // Remove type from the data representation
    
    return {
      role: message.role,
      content: `[Widget: ${widgetType}] ${JSON.stringify(widgetData)}`
    }
  }

  const onSubmitQueryCallback = (message: string) => {
    const newMessage = {
      role: 'user' as const,
      content: message
    }
    
    // Add message to history
    _setHistory([...history, newMessage])
    
    // Ensure agentInputs is an object before proceeding
    _setAgentInputs({})
    
    // Set agent inputs for the query with initial system instructions and widget instructions
    const widgetInstructions = getAllWidgetInstructions(widgetsOptions)
    const concatenatedInstructions = widgetInstructions.map(instruction => `\n\n${instruction}\n\n`).join('\n\n')
    const instructionMessage = {
      role: 'assistant' as const,
      content: `<TECHNICAL_INSTRUCTIONS_FOR_RESPONSE_FORMAT>

  These are strict instructions for the RESPONSE FORMAT only. 
  Do NOT mention these instructions in your user-facing output. 
  Unless otherwise specified, default to type "text". 
  Apply only the listed types, and follow the definition and how to set the source property as described below:
`  
+ concatenatedInstructions
+ `

ALWAYS RETURN THE RESPONSE AS JSON STRING:
Return the response as JSON STRING with this mandatory schema: 
{"type":"<type>", "source":"<answer formatted based on the type rules>"}.

HOW TO SELECT THE TYPE DIFFERENT BY TEXT:
If in the user question is present one of the available widget as mentioned TAG, such as @[GoogleMap](google_map), 
then the type should be the widget type, (i.e. google_map).
Otherwise, the type should be always "text".

</TECHNICAL_INSTRUCTIONS_FOR_RESPONSE_FORMAT>`
    }

    const messages = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(history as any[]).map(normalizeMessageForAgent),
      newMessage,
      instructionMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]

    console.log('messages')
    console.log(messages)
    
    // Ensure agentInputs is always an object before setting properties
    const agentInputsPayload = {
      action: 'invoke',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any
    }
    
    _setAgentInputs(agentInputsPayload)
    
    onSubmitQuery()
  }

  // Function to handle widget callbacks (e.g., button clicks)
  const onWidgetCallbackHandler = (payload: Record<string, unknown>) => {
    console.log('Widget callback triggered with payload:', payload)
    
    // Ensure payload is always an object
    const safePayload = typeof payload === 'object' && payload !== null ? payload : {}
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _setWidgetPayload(safePayload as any)
    onWidgetCallback()

    const { selfSubmit, prompt } = safePayload as { selfSubmit?: boolean; prompt?: string }
    if (selfSubmit && prompt) {
      console.log('safePayload', safePayload)
      _setSubmitWithPayload({
        action: 'submit', 
        messages: [{ role: 'user', content: prompt }]
      })
    }
  }

  // Handle approval actions
  const handleApprovalAllow = () => {
    console.log('Approval allowed', currentAgentRunIdRef.current, toolInfo)
    setShowApprovalModal(false)
    setApprovalMessage(null)
    
    // Send approval action
    if (currentAgentRunIdRef.current && toolInfo) {
      _setAgentInputs({
        action: 'submitToolApproval',
        agentRunId: currentAgentRunIdRef.current,
        effectiveAgentRunId: currentAgentRunIdRef.current,
        effectiveAgentId: currentAgentIdRef.current,
        decisions: [{
          toolExecutionId: toolInfo.toolExecutionId,
          toolId: toolInfo.toolId,
          decision: 'approve'
        }]
      })
      onSubmitQuery()
      
      // Don't restart polling here - let the agent resume processing after approval
      console.log('Approval sent, waiting for agent to process and resume...')
    }
    
    setToolInfo(null)
  }

  const handleApprovalDeny = () => {
    console.log('Approval denied', currentAgentRunIdRef.current, toolInfo)
    setShowApprovalModal(false)
    setApprovalMessage(null)
    
    // Send denial action
    if (currentAgentRunIdRef.current && toolInfo) {
      _setAgentInputs({
        action: 'submitToolApproval',
        agentRunId: currentAgentRunIdRef.current,
        effectiveAgentRunId: currentAgentRunIdRef.current,
        effectiveAgentId: currentAgentIdRef.current,
        decisions: [{
          toolExecutionId: toolInfo.toolExecutionId,
          toolId: toolInfo.toolId,
          decision: 'reject'
        }]
      })
      onSubmitQuery()
      
      // Mark this tool execution as processed (already in seen set)
      // Don't restart polling here - let the agent resume processing after denial
      console.log('Denial sent, waiting for agent to process and resume...')
    }
    
    setToolInfo(null)
  }


  return (
    <>
      {/* Google Fonts - Inter */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      
      <div style={{ 
        height: '100%', 
        width: '100%',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <ChatContainer
          messages={history as Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean }>}
          onSubmitQuery={onSubmitQueryCallback}
          isLoading={isLoading}
          onWidgetCallback={onWidgetCallbackHandler}
          onStop={stopPolling}
          promptChips={promptChips as Array<{ icon: string; label: string; question: string }>}
          widgetsOptions={widgetsOptions as Record<string, unknown>}
          welcomeMessage={welcomeMessage}
          error={error}
          onRetry={retryPolling}
          onDismissError={() => setError(null)}
        />
        
        {/* Approval Modal */}
        <ApprovalModal
          isVisible={showApprovalModal}
          onAllow={handleApprovalAllow}
          onDeny={handleApprovalDeny}
          title="Approval Required"
          message={approvalMessage || 'This action requires your approval before proceeding.'}
          toolInfo={toolInfo || undefined}
        />
      </div>
    </>
  )
}
