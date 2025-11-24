import React, { useRef, useState, useEffect } from 'react'
import { type FC } from 'react'

import { Retool } from '@tryretool/custom-component-support'
import { ChatContainer } from './components'
import { ApprovalModal } from './components/ApprovalModal'
import { getWidgetInstructionsForTypes, WIDGET_REGISTRY } from './components/widgets'

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

  // Add state for tools configuration
  const [tools, _setTools] = Retool.useStateObject({
    name: 'tools',
    initialValue: {},
    inspector: 'hidden',
  })

  // Add state for input placeholder
  const [placeholder, _setPlaceholder] = Retool.useStateString({
    name: 'placeholder',
    initialValue: 'Type your message... (use @ to insert widgets)'
  })

  // Add state for style preferences
  const [stylePreferences, _setStylePreferences] = Retool.useStateObject({
    name: 'stylePreferences',
    initialValue: {}
  })



  const [history, _setHistory] = Retool.useStateArray({
    name: 'history',
    initialValue: []
  })

  // Add state for last user message submitted
  const [_lastMessage, _setLastMessage] = Retool.useStateString({
    name: 'lastMessage',
    initialValue: '',
    inspector: 'hidden',
  })

  const [_agentInputs, _setAgentInputs] = Retool.useStateObject({
    name: 'agentInputs',
    initialValue: {},
    inspector: 'hidden',
  })

  // Add state for widget payload
  const [_widgetPayload, _setWidgetPayload] = Retool.useStateObject({
    name: 'widgetPayload',
    initialValue: {},
    inspector: 'hidden',
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
  
  // Ref to track if auto-submit is currently in progress to prevent duplicate triggers
  const autoSubmitInProgressRef = useRef<boolean>(false)
  
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
  // Track last processed simple response to prevent infinite loops
  const lastProcessedSimpleResponseRef = useRef<string | null>(null)
  
  // Ref to track latest history to avoid stale closure issues
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean }>>([])

  // Ensure internal state variables are always empty objects on mount
  useEffect(() => {
    // Force reset to empty objects to override any user configuration
    _setAgentInputs({})
    _setWidgetPayload({})
  }, [])
  
  // Keep historyRef in sync with history state
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    historyRef.current = history as any
  }, [history])

  // Monitor submitWithPayload changes
  useEffect(() => {
    // Check if submitWithPayload has actually changed
    const currentValue = submitWithPayload || {}
    const previousValue = previousSubmitWithPayloadRef.current

    // console.log('submitWithPayload currentValue', currentValue)
    // console.log('submitWithPayload previousValue', previousValue)
    
    // Deep comparison to check if values are different
    const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(previousValue)
    
    if (!hasChanged) {
      console.log('submitWithPayload unchanged, skipping processing')
      return
    }
    
    // Only proceed if there's actual content
    if (Object.keys(currentValue).length === 0) {
      // Update the ref even for empty values to track changes
      previousSubmitWithPayloadRef.current = { ...currentValue }
      return
    }

    const { action, messages, autoSubmit } = currentValue as { 
      action?: string; 
      messages?: Array<{ role: 'user' | 'assistant'; content: string; hidden?: boolean }>; 
      autoSubmit?: boolean;
    }

    console.log('submitWithPayload action detected:', action, 'messages:', messages)
    console.log('autoSubmit extracted from currentValue:', autoSubmit, 'type:', typeof autoSubmit)

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
      
      // Create updated history that includes the new messages
      // Use historyRef.current to get the latest history and avoid stale closure issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedHistory = [...historyRef.current, ...newMessages]
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory(updatedHistory as any)
      
      // Update historyRef immediately to keep it in sync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historyRef.current = updatedHistory as any
      
      // If there are user messages, trigger the last one for processing
      const userMessages = messages.filter(msg => msg.role === 'user')
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1]
        // Pass the updated history to avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmitQueryCallback(lastUserMessage.content, updatedHistory as any)
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
      // Use historyRef.current to get the latest history and avoid stale closure issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedHistoryWithHidden = [...historyRef.current, ...hiddenMessages]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory(updatedHistoryWithHidden as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historyRef.current = updatedHistoryWithHidden as any
      
      // Reset the submitWithPayload to prevent repeated triggers
      setTimeout(() => {
        _setSubmitWithPayload({})
      }, 0)
    } else if (action === 'restore' && messages && Array.isArray(messages)) {
      // Check if we're already processing a restore action
      if (autoSubmitInProgressRef.current) {
        console.log('Restore action skipped: auto-submit already in progress')
        // Update the ref to prevent re-triggers
        previousSubmitWithPayloadRef.current = { ...currentValue }
        return
      }
      
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
      // Update historyRef to keep it in sync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historyRef.current = restoredMessages as any
      
      // If autoSubmit is enabled and there are user messages, trigger the last one for processing
      console.log('autoSubmit value in restore action:', autoSubmit, 'type:', typeof autoSubmit)
      if (autoSubmit === true) {
        const userMessages = messages.filter(msg => msg.role === 'user')
        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1]
          
          // Check if auto-submit is already in progress or if we're already loading
          if (autoSubmitInProgressRef.current || isLoading) {
            console.log('Auto-submit skipped: already in progress or loading state active')
            return
          }
          
          // Set the flag to prevent duplicate triggers
          autoSubmitInProgressRef.current = true
          console.log('Auto-submitting last user message after restore:', lastUserMessage.content)
          
          // Use a special version of submit that doesn't add to history since we already have the restored messages
          // Pass the restored messages directly to avoid stale closure issue
          onSubmitQueryCallbackAfterRestore(lastUserMessage.content, restoredMessages)
        }
      } else {
        console.log('Restore completed without auto-submission (autoSubmit not enabled)')
        // Reset the auto-submit flag since we're not auto-submitting
        autoSubmitInProgressRef.current = false
      }
      
      // Reset the submitWithPayload to prevent repeated triggers
      setTimeout(() => {
        _setSubmitWithPayload({})
      }, 0)
    } else {
      console.log('Unknown action or missing messages:', action, messages)
      // Update the ref even for unknown actions
      previousSubmitWithPayloadRef.current = { ...currentValue }
    }
  }, [submitWithPayload, history])

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
    console.log('AAA queryResponse changed:', queryResponse)
    
    // Early detection for simple response format (simple LLM call)
    // Simple format: object with {type, source} structure, no status/agentRunId
    // Complex format: object with status, agentRunId, pagination, etc.
    if (queryResponse && typeof queryResponse === 'object' && !Array.isArray(queryResponse)) {
      // Check if it's NOT the complex flow format (missing status/agentRunId)
      const isSimpleFormat = !queryResponse.status && !queryResponse.agentRunId && !queryResponse.pagination
      
      if (isSimpleFormat && queryResponse.type) {
        // Check if we've already processed this exact response to prevent infinite loops
        const responseKey = JSON.stringify(queryResponse)
        if (lastProcessedSimpleResponseRef.current === responseKey) {
          console.log('Simple response already processed, skipping')
          return // Already processed, skip to prevent infinite loop
        }
        
        // Mark this response as processed
        lastProcessedSimpleResponseRef.current = responseKey
        
        // This is the simple format - use the object directly as content
        const parsedContent: string | { type: string; [key: string]: unknown } = queryResponse as { type: string; [key: string]: unknown }
        
        const assistantMessage = {
          role: 'assistant' as const,
          content: parsedContent
        }

        console.log('Simple response format detected, parsedContent:', parsedContent)

        // Use historyRef to get the latest history and avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistoryWithResponse = [...historyRef.current, assistantMessage]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistoryWithResponse as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistoryWithResponse as any
        
        // Clear loading state and errors
        setIsLoading(false)
        setError(null)
        return // Early return to skip all complex flow logic
      }
    }

    // Continue with complex flow logic for object responses
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

        // Use historyRef to get the latest history and avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistoryWithResponse = [...historyRef.current, assistantMessage]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistoryWithResponse as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistoryWithResponse as any
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

  // Function to extract mentions from a message
  const extractMentions = (message: string): Array<{ display: string; key: string }> => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: Array<{ display: string; key: string }> = []
    let match
    
    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push({
        display: match[1],
        key: match[2]
      })
    }
    
    return mentions
  }

  // Function to extract widget mentions from a message
  const extractWidgetMentions = (message: string): string[] => {
    const mentions = extractMentions(message)
    const widgetTypes = mentions
      .map(mention => mention.key)
      .filter(key => WIDGET_REGISTRY[key] !== undefined)
    return widgetTypes
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
      content: `[${widgetType}] ${JSON.stringify(widgetData)}`
    }
  }

  const onSubmitQueryCallback = (message: string, providedHistory?: Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean }>) => {
    // Update the exposed message state with the last user-submitted message
    _setLastMessage(message)
    
    const newMessage = {
      role: 'user' as const,
      content: message
    }
    
    // Use provided history if available (to avoid stale closure), otherwise use current history from ref
    const currentHistory = providedHistory || historyRef.current
    
    // Only add message to history if it wasn't already added (i.e., if history wasn't provided)
    if (!providedHistory) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedHistory = [...historyRef.current, newMessage]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory(updatedHistory as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historyRef.current = updatedHistory as any
    }
    
    // Ensure agentInputs is an object before proceeding
    _setAgentInputs({})
    
    // Check for widget mentions
    const mentionedWidgets = extractWidgetMentions(message)

    // Check if the last message in currentHistory is already the same as newMessage
    // This prevents duplication when providedHistory already includes the message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastMessage = currentHistory.length > 0 ? (currentHistory[currentHistory.length - 1] as any) : null
    const isMessageAlreadyInHistory = lastMessage && 
      lastMessage.role === 'user' && 
      typeof lastMessage.content === 'string' && 
      lastMessage.content === message

    const messages = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(currentHistory as any[]).map(normalizeMessageForAgent),
      // Only add newMessage if it's not already the last message in history
      ...(isMessageAlreadyInHistory ? [] : [newMessage]),
    ]

    // Always add instruction message - with mentioned widgets if any, otherwise just text widget
    const widgetInstructions = getWidgetInstructionsForTypes(mentionedWidgets, widgetsOptions)
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
    
    messages.push(instructionMessage)

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

  // Special version of onSubmitQueryCallback for use after restore - doesn't add to history
  const onSubmitQueryCallbackAfterRestore = (message: string, restoredMessages?: Array<{ role: 'user' | 'assistant'; content: string; hidden?: boolean }>) => {
    // Update the exposed message state with the last user-submitted message
    _setLastMessage(message)
    
    // Don't add message to history since it's already been restored
    console.log('Submitting query after restore without adding to history:', message)
    
    // Ensure agentInputs is an object before proceeding
    _setAgentInputs({})
    
    // Check for widget mentions
    const mentionedWidgets = extractWidgetMentions(message)

    // Use restored messages if provided, otherwise fall back to current history from ref
    const messagesToUse = restoredMessages || historyRef.current

    const messages = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(messagesToUse as any[]).map(normalizeMessageForAgent),
      // Don't add the new message since it's already in the restored history
    ]

    // Always add instruction message - with mentioned widgets if any, otherwise just text widget
    const widgetInstructions = getWidgetInstructionsForTypes(mentionedWidgets, widgetsOptions)
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
    
    messages.push(instructionMessage)

    console.log('messages (after restore)')
    console.log(messages)
    
    // Ensure agentInputs is always an object before setting properties
    const agentInputsPayload = {
      action: 'invoke',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any
    }
    
    _setAgentInputs(agentInputsPayload)
    
    onSubmitQuery()
    
    // Reset the auto-submit flag after a short delay to allow the query to start
    setTimeout(() => {
      autoSubmitInProgressRef.current = false
      console.log('Auto-submit flag reset')
    }, 1000) // 1 second delay to ensure query has started
  }

  // Function to handle widget callbacks (e.g., button clicks)
  const onWidgetCallbackHandler = (payload: Record<string, unknown>) => {
    console.log('Widget callback triggered with payload:', payload)
    
    // Ensure payload is always an object
    const safePayload = typeof payload === 'object' && payload !== null ? payload : {}
    
    // Handle widget removal requests
    const { type, messageIndex } = safePayload as { 
      type?: string;
      messageIndex?: number;
    }
    
    if (type === 'widget:remove' && typeof messageIndex === 'number') {
      console.log('Removing widget at message index:', messageIndex)
      
      // Get current history from ref to avoid stale closure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentHistory = historyRef.current as Array<{ 
        role: 'user' | 'assistant'; 
        content: string | { type: string; source?: string; [key: string]: unknown }; 
        hidden?: boolean 
      }>
      
      // Validate message index
      if (messageIndex >= 0 && messageIndex < currentHistory.length) {
        // Mark the message as hidden
        const updatedHistory = [...currentHistory]
        updatedHistory[messageIndex] = {
          ...updatedHistory[messageIndex],
          hidden: true
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistory as any)
        // Update historyRef to keep it in sync
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistory as any
        console.log('Widget removed successfully (message hidden)')
        
        // Don't dispatch to Retool for internal removal actions
        return
      } else {
        console.warn('Cannot remove widget: invalid message index:', messageIndex)
      }
    }
    
    if (type === 'widget:try_again' && typeof messageIndex === 'number') {
      console.log('Try again triggered for widget at message index:', messageIndex)
      
      // Get current history from ref to avoid stale closure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentHistory = historyRef.current as Array<{ 
        role: 'user' | 'assistant'; 
        content: string | { type: string; source?: string; [key: string]: unknown }; 
        hidden?: boolean 
      }>
      
      // Validate message index
      if (messageIndex >= 0 && messageIndex < currentHistory.length) {
        // Find the previous user message before this widget message
        let previousUserMessage: string | null = null
        
        // Look backwards from the widget message to find the last user message
        for (let i = messageIndex - 1; i >= 0; i--) {
          const message = currentHistory[i]
          if (message.role === 'user' && typeof message.content === 'string' && !message.hidden) {
            previousUserMessage = message.content
            break
          }
        }
        
        if (previousUserMessage) {
          console.log('Found previous user message, resubmitting:', previousUserMessage)
          
          // Create history up to (but not including) the widget message
          const historyBeforeWidget = currentHistory.slice(0, messageIndex)
          
          // Resubmit the previous user message
          onSubmitQueryCallback(previousUserMessage, historyBeforeWidget)
          
          // Don't dispatch to Retool for internal try again actions
          return
        } else {
          console.warn('Cannot try again: no previous user message found')
        }
      } else {
        console.warn('Cannot try again: invalid message index:', messageIndex)
      }
    }
    
    // Handle history update requests
    const { updateHistory, historyIndex, updatedSource } = safePayload as { 
      updateHistory?: boolean; 
      historyIndex?: number; 
      updatedSource?: Record<string, unknown> 
    }
    
    if (updateHistory && typeof historyIndex === 'number' && updatedSource) {
      console.log('Updating history at index:', historyIndex, 'with:', updatedSource)
      
      // Get current history from ref to avoid stale closure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentHistory = historyRef.current as Array<{ 
        role: 'user' | 'assistant'; 
        content: string | { type: string; source?: string; [key: string]: unknown }; 
        hidden?: boolean 
      }>
      
      // Validate history index
      if (historyIndex >= 0 && historyIndex < currentHistory.length) {
        const targetMessage = currentHistory[historyIndex]
        
        // Only update assistant messages with widget content
        if (targetMessage.role === 'assistant' && 
            typeof targetMessage.content === 'object' && 
            targetMessage.content !== null &&
            'type' in targetMessage.content &&
            'source' in targetMessage.content) {
          
          // Create updated message with merged source
          const widgetContent = targetMessage.content as { type: string; source?: string | Record<string, unknown>; [key: string]: unknown }
          const updatedMessage = {
            ...targetMessage,
            content: {
              ...widgetContent,
              source: {
                ...(widgetContent.source as Record<string, unknown>),
                ...updatedSource
              }
            } as unknown as { type: string; source?: string; [key: string]: unknown }
          }
          
          // Update history with the modified message
          const updatedHistory = [...currentHistory]
          updatedHistory[historyIndex] = updatedMessage
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _setHistory(updatedHistory as any)
          // Update historyRef to keep it in sync
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          historyRef.current = updatedHistory as any
          console.log('History updated successfully')
        } else {
          console.warn('Cannot update history: invalid message type or structure')
        }
      } else {
        console.warn('Cannot update history: invalid history index:', historyIndex)
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _setWidgetPayload(safePayload as any)
    
    // Only dispatch to Retool if this is NOT just a history update
    // History updates are internal and shouldn't trigger external events
    if (!updateHistory) {
      // Defer dispatch so widgetPayload state is flushed before Retool reads it
      requestAnimationFrame(() => {
        onWidgetCallback()
      })
    }

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
      
      {/* Tabulator CSS */}
      <link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css" />
      
      {/* FullCalendar CSS */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.19/main.min.css" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.19/main.min.css" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.19/main.min.css" />
      
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
          tools={tools as Record<string, { tool: string; description: string }>}
          welcomeMessage={welcomeMessage}
          error={error}
          onRetry={retryPolling}
          onDismissError={() => setError(null)}
          placeholder={placeholder}
          stylePreferences={stylePreferences as Record<string, unknown>}
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
