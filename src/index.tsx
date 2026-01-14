import React, { useRef, useState, useEffect } from 'react'
import { type FC } from 'react'

import { Retool } from '@tryretool/custom-component-support'
import { ChatContainer } from './components'
import { ApprovalModal } from './components/ApprovalModal'
import { getWidgetInstructionsForTypes, WIDGET_REGISTRY, GlobalAssets } from './components/widgets'
import { preprocessCanvasWidgetHtml } from './utils/widgetUtils'
import { SearchBar } from './components/SearchBar'

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

  // Add state for promoted widgets (external control via Retool)
  const [promotedWidgets, _setPromotedWidgets] = Retool.useStateObject({
    name: 'promoted_widgets',
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

  // Add state for component preferences (stylistic and behavioral)
  const [componentPreferences, _setComponentPreferences] = Retool.useStateObject({
    name: 'componentPreferences',
    initialValue: {}
  })



  const [history, _setHistory] = Retool.useStateArray({
    name: 'history',
    initialValue: [],
    inspector: 'hidden'
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

  // Add state for chip payload
  const [_chipPayload, _setChipPayload] = Retool.useStateObject({
    name: 'chipPayload',
    initialValue: {},
    inspector: 'hidden',
  })

  // Add state for last response payload
  const [_lastResponse, _setLastResponse] = Retool.useStateObject({
    name: 'lastResponse',
    initialValue: {},
    inspector: 'hidden',
  })

  // Add state for submit with payload
  const [submitWithPayload, _setSubmitWithPayload] = Retool.useStateObject({
    name: 'submitWithPayload',
    initialValue: {}
  })

  
  // Dynamic search data from Retool state (category-agnostic)
  const [searchData, _setSearchData] = Retool.useStateObject({
    name: 'searchData',
    initialValue: {}
  })

  // Add state for selected search result stored in Retool state
  const [selectedItem, _setSelectedItem] = Retool.useStateObject({
    name: 'selectedItem',
    initialValue: {},
    inspector: 'hidden'
  })

  // Add state for search bar visibility (checkbox inspector)
  const [showSearchBar, _setShowSearchBar] = Retool.useStateBoolean({
    name: 'showSearchBar',
    initialValue: true,
    label: 'Show Search Bar',
    description: 'Toggle to show or hide the search bar',
    inspector: 'checkbox'
  })

  // Monitor selectedItem changes to debug state updates
  useEffect(() => {
    console.log('=== selectedItem changed in parent ===', selectedItem, 'keys:', Object.keys(selectedItem || {}).length)
  }, [selectedItem])


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
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean; blockId?: number; blockIndex?: number; blockTotal?: number }>>([])
  
  // Ref to track if first submit event has been fired
  const firstSubmitFiredRef = useRef<boolean>(false)
  
  // Ref to track last response that fired the lastResponse event to prevent duplicates
  const lastResponseFiredRef = useRef<string | null>(null)

  // Ensure internal state variables are always empty objects on mount
  useEffect(() => {
    // Force reset to empty objects to override any user configuration
    _setAgentInputs({})
    _setWidgetPayload({})
    _setChipPayload({})
    _setLastResponse({})
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
      messages?: Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean; blockId?: number; blockIndex?: number; blockTotal?: number }>; 
      autoSubmit?: boolean;
    }

    console.log('submitWithPayload action detected:', action, 'messages:', messages)
    console.log('autoSubmit extracted from currentValue:', autoSubmit, 'type:', typeof autoSubmit)

    if (action === 'submit' && messages && Array.isArray(messages) && messages.length > 0) {
      // Update the ref BEFORE processing to prevent re-triggers
      previousSubmitWithPayloadRef.current = { ...currentValue }
      
      // Process each message in the array
      console.log('Triggering submit with messages:', messages)
      
      // Add all messages to history, preserving block properties
      const newMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.hidden && { hidden: msg.hidden }),
        ...(msg.blockId !== undefined && { blockId: msg.blockId }),
        ...(msg.blockIndex !== undefined && { blockIndex: msg.blockIndex }),
        ...(msg.blockTotal !== undefined && { blockTotal: msg.blockTotal })
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
        // Extract string content (user messages should always be strings)
        const messageContent = typeof lastUserMessage.content === 'string' 
          ? lastUserMessage.content 
          : JSON.stringify(lastUserMessage.content)
        // Pass the updated history to avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmitQueryCallback(messageContent, updatedHistory as any)
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
      
      // Inject multiple hidden messages for context, preserving block properties
      console.log('Injecting hidden context messages:', messages)
      const hiddenMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        hidden: true, // Flag to indicate these messages should not be displayed
        ...(msg.blockId !== undefined && { blockId: msg.blockId }),
        ...(msg.blockIndex !== undefined && { blockIndex: msg.blockIndex }),
        ...(msg.blockTotal !== undefined && { blockTotal: msg.blockTotal })
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
      
      // Restore history with the provided messages, preserving block properties
      console.log('Restoring history with messages:', messages)
      const restoredMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.hidden && { hidden: msg.hidden }),
        ...(msg.blockId !== undefined && { blockId: msg.blockId }),
        ...(msg.blockIndex !== undefined && { blockIndex: msg.blockIndex }),
        ...(msg.blockTotal !== undefined && { blockTotal: msg.blockTotal })
      }))
      
      // Replace the entire history with the restored messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _setHistory(restoredMessages as any)
      // Update historyRef to keep it in sync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historyRef.current = restoredMessages as any
      console.log('historyRef after restore:', historyRef.current)
      
      // Reset first submit flag if restored history is empty (no visible messages)
      const visibleRestoredMessages = restoredMessages.filter(msg => !msg.hidden)
      if (visibleRestoredMessages.length === 0) {
        firstSubmitFiredRef.current = false
      }
      
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
          
          // Extract string content (user messages should always be strings)
          const messageContent = typeof lastUserMessage.content === 'string' 
            ? lastUserMessage.content 
            : JSON.stringify(lastUserMessage.content)
          
          // Set the flag to prevent duplicate triggers
          autoSubmitInProgressRef.current = true
          console.log('Auto-submitting last user message after restore:', messageContent)
          
          // Use a special version of submit that doesn't add to history since we already have the restored messages
          // Pass the restored messages directly to avoid stale closure issue
          onSubmitQueryCallbackAfterRestore(messageContent, restoredMessages)
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
  const onFirstSubmit = Retool.useEventCallback({ name: "firstSubmit" })
  const onChipCallback = Retool.useEventCallback({ name: "chipCallback" })
  const onLastResponse = Retool.useEventCallback({ name: "lastResponse" })

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

  // Helper function to fire lastResponse event
  const fireLastResponseEvent = (assistantMessages: Array<{ role: 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; blockId?: number; blockIndex?: number; blockTotal?: number }>) => {
    // Create a unique key for this response based on the messages
    const responseKey = JSON.stringify(assistantMessages)
    
    // Check if we've already fired the event for this response
    if (lastResponseFiredRef.current === responseKey) {
      console.log('lastResponse event already fired for this response, skipping')
      return
    }
    
    // Mark this response as processed
    lastResponseFiredRef.current = responseKey
    
    // Extract widgets data for the event payload
    const widgets = assistantMessages.map(msg => {
      if (typeof msg.content === 'object' && msg.content !== null) {
        return msg.content
      }
      return { type: 'text', source: typeof msg.content === 'string' ? msg.content : String(msg.content) }
    })
    
    // Prepare the payload
    const payload = {
      widgets: widgets,
      blockId: assistantMessages[0]?.blockId,
      timestamp: Date.now(),
      messageCount: assistantMessages.length
    }
    
    // Set the state variable with the payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _setLastResponse(payload as any)
    
    // Fire the event (Retool will read the state variable)
    requestAnimationFrame(() => {
      onLastResponse()
    })
  }

  // Monitor queryResponse for status changes using useEffect to prevent infinite loops
  useEffect(() => {
    console.log('AAA queryResponse changed:', queryResponse)
    
    // Early return if queryResponse is null/undefined/empty
    if (!queryResponse || (typeof queryResponse === 'object' && Object.keys(queryResponse).length === 0 && !Array.isArray(queryResponse))) {
      return
    }
    
    // queryResponse is always an object from Retool.useStateObject
    // The LLM response array is stored in queryResponse.widgets
    // Check if widgets property exists and is an array (simple Query format)
    if (queryResponse && typeof queryResponse === 'object' && !Array.isArray(queryResponse)) {
      // Check if it has widgets property (simple Query format)
      if (queryResponse.widgets && Array.isArray(queryResponse.widgets)) {
        // Check if we've already processed this exact response to prevent infinite loops
        const responseKey = JSON.stringify(queryResponse.widgets)
        if (lastProcessedSimpleResponseRef.current === responseKey) {
          console.log('Simple widgets response already processed, skipping')
          return // Already processed, skip to prevent infinite loop
        }
        
        // Mark this response as processed
        lastProcessedSimpleResponseRef.current = responseKey
        
        // Process widgets array
        const widgetArray = queryResponse.widgets as Array<{ type: string; source?: string; [key: string]: unknown }>
        
        // If empty array, allow it (render nothing)
        if (widgetArray.length === 0) {
          console.log('Empty widgets array, skipping message creation')
          setIsLoading(false)
          setError(null)
          return
        }
        
        // Create message entries for each widget with block tracking
        const blockId = Date.now() // Unique ID for this response block
        const assistantMessages = widgetArray.map((widget, index) => ({
          role: 'assistant' as const,
          content: widget,
          blockId: blockId,
          blockIndex: index,
          blockTotal: widgetArray.length
        }))

        console.log('Simple widgets response format detected, widgetArray:', widgetArray, 'assistantMessages:', assistantMessages)

        // Use historyRef to get the latest history and avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistoryWithResponse = [...historyRef.current, ...assistantMessages]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistoryWithResponse as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistoryWithResponse as any
        
        // Fire lastResponse event
        fireLastResponseEvent(assistantMessages)
        
        // Clear loading state and errors
        setIsLoading(false)
        setError(null)
        return // Early return to skip all complex flow logic
      }
      
      // Legacy support: Check if it's a simple object format with type property (not complex flow format)
      const isSimpleFormat = !queryResponse.status && !queryResponse.agentRunId && !queryResponse.pagination
      
      if (isSimpleFormat && queryResponse.type && !queryResponse.widgets) {
        // Check if we've already processed this exact response to prevent infinite loops
        const responseKey = JSON.stringify(queryResponse)
        if (lastProcessedSimpleResponseRef.current === responseKey) {
          console.log('Simple response already processed, skipping')
          return // Already processed, skip to prevent infinite loop
        }
        
        // Mark this response as processed
        lastProcessedSimpleResponseRef.current = responseKey
        
        // Wrap single object in array
        const widgetArray = [queryResponse as { type: string; source?: string; [key: string]: unknown }]
        
        // Create message entries for each widget with block tracking
        const blockId = Date.now() // Unique ID for this response block
        const assistantMessages = widgetArray.map((widget, index) => ({
          role: 'assistant' as const,
          content: widget,
          blockId: blockId,
          blockIndex: index,
          blockTotal: widgetArray.length
        }))

        console.log('Simple object response format detected, widgetArray:', widgetArray, 'assistantMessages:', assistantMessages)

        // Use historyRef to get the latest history and avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistoryWithResponse = [...historyRef.current, ...assistantMessages]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistoryWithResponse as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistoryWithResponse as any
        
        // Fire lastResponse event
        fireLastResponseEvent(assistantMessages)
        
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
      
      // First, try to parse resultText/content if they are JSON strings
      let parsedResponse = queryResponse
      const aiResponse = queryResponse.content || queryResponse.resultText
      
      if (aiResponse && typeof aiResponse === 'string') {
        try {
          // Pre-process to encode HTML in canvas widget sources before JSON parsing
          const preprocessedResponse = preprocessCanvasWidgetHtml(aiResponse)
          // Try to parse as JSON first
          const jsonResponse = JSON.parse(preprocessedResponse)
          // Merge parsed response with existing queryResponse, prioritizing parsed widgets
          parsedResponse = { ...queryResponse, ...jsonResponse }
          console.log('Parsed resultText/content as JSON:', jsonResponse)
        } catch {
          // If not JSON, continue with original queryResponse
          console.log('resultText/content is not JSON, treating as plain text')
        }
      }
      
      // Check if widgets property exists (preferred format)
      if (parsedResponse.widgets && Array.isArray(parsedResponse.widgets)) {
        const widgetArray = parsedResponse.widgets as Array<{ type: string; source?: string; [key: string]: unknown }>
        
        // If empty array, allow it (render nothing)
        if (widgetArray.length === 0) {
          console.log('Empty widgets array, skipping message creation')
          setIsLoading(false)
          setError(null)
          return
        }
        
        // Create message entries for each widget with block tracking
        const blockId = Date.now() // Unique ID for this response block
        const assistantMessages = widgetArray.map((widget, index) => ({
          role: 'assistant' as const,
          content: widget,
          blockId: blockId,
          blockIndex: index,
          blockTotal: widgetArray.length
        }))

        console.log('Agent completed with widgets array:', widgetArray)
        console.log('assistantMessages:', assistantMessages)

        // Use historyRef to get the latest history and avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistoryWithResponse = [...historyRef.current, ...assistantMessages]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistoryWithResponse as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistoryWithResponse as any
        
        // Fire lastResponse event
        fireLastResponseEvent(assistantMessages)
        return
      }
      
      // Fallback: If no widgets property, try to parse content/resultText as array or single object
      if (aiResponse) {
        let widgetArray: Array<{ type: string; source?: string; [key: string]: unknown }>
        
        try {
          // Pre-process to encode HTML in canvas widget sources before JSON parsing
          const preprocessedResponse = typeof aiResponse === 'string' 
            ? preprocessCanvasWidgetHtml(aiResponse) 
            : aiResponse
          // Try to parse as JSON first
          const jsonResponse = typeof preprocessedResponse === 'string' 
            ? JSON.parse(preprocessedResponse) 
            : preprocessedResponse
          
          // Check if it's an object with widgets property
          if (jsonResponse && typeof jsonResponse === 'object' && jsonResponse.widgets && Array.isArray(jsonResponse.widgets)) {
            widgetArray = jsonResponse.widgets
          } else if (Array.isArray(jsonResponse)) {
            // Direct array format
            widgetArray = jsonResponse
          } else if (jsonResponse && typeof jsonResponse === 'object' && jsonResponse.type) {
            // Wrap single object in array
            widgetArray = [jsonResponse as { type: string; source?: string; [key: string]: unknown }]
          } else {
            // Fallback: wrap as text widget
            widgetArray = [{ type: 'text', source: String(jsonResponse) }]
          }
        } catch {
          // If not JSON, treat as plain text and wrap as text widget
          widgetArray = [{ type: 'text', source: String(aiResponse) }]
        }
        
        // If empty array, allow it (render nothing)
        if (widgetArray.length === 0) {
          console.log('Empty array response, skipping message creation')
          setIsLoading(false)
          setError(null)
          return
        }
        
        // Create message entries for each widget with block tracking
        const blockId = Date.now() // Unique ID for this response block
        const assistantMessages = widgetArray.map((widget, index) => ({
          role: 'assistant' as const,
          content: widget,
          blockId: blockId,
          blockIndex: index,
          blockTotal: widgetArray.length
        }))

        console.log('parsedContent (array):', widgetArray)
        console.log('assistantMessages:', assistantMessages)

        // Use historyRef to get the latest history and avoid stale closure issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistoryWithResponse = [...historyRef.current, ...assistantMessages]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _setHistory(updatedHistoryWithResponse as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        historyRef.current = updatedHistoryWithResponse as any
        
        // Fire lastResponse event
        fireLastResponseEvent(assistantMessages)
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
  // For messages with blockId, each widget is normalized separately (they're already separate messages)
  const normalizeMessageForAgent = (message: { role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; blockId?: number; blockIndex?: number; blockTotal?: number }) => {
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

  const onSubmitQueryCallback = (message: string, providedHistory?: Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean; blockId?: number; blockIndex?: number; blockTotal?: number }>) => {
    // Check if this is the first submit (history is empty, excluding hidden messages)
    const currentHistory = providedHistory || historyRef.current
    const visibleMessages = currentHistory.filter(msg => !msg.hidden)
    const isFirstSubmit = visibleMessages.length === 0 && !firstSubmitFiredRef.current
    
    // Update the exposed message state with the last user-submitted message
    _setLastMessage(message)
    
    const newMessage = {
      role: 'user' as const,
      content: message
    }
    
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

    // If there's a selected item, inject it as a hidden assistant message so the agent receives structured context
    if (selectedItem && Object.keys(selectedItem).length > 0 && !(selectedItem as any)._cleared) {
      // stringify selectedItem and inject as a plain string (remove object/type wrapper)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages.push({
        role: 'assistant' as const,
        content: JSON.stringify(selectedItem),
        hidden: true
      } as any)
    }

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
{"widgets": [{"type":"<type>", "source":"<answer formatted based on the type rules>"}, ...]}

The response MUST be an object with a "widgets" property containing an array.
The widgets array MUST always contain at least one widget object, even if it's just one widget.
When multiple widgets make sense (e.g., text explanation + video + text conclusion), 
return them as separate objects in the widgets array: {"widgets": [{"type":"text", "source":"..."}, {"type":"video", "source":"..."}, {"type":"text", "source":"..."}]}

Example single widget response:
{"widgets": [{"type":"text", "source":"Hello! How can I help you today?"}]}

Example multiple widgets response:
{"widgets": [{"type":"text", "source":"Here's an introduction"}, {"type":"video", "source":"https://example.com/video.mp4"}, {"type":"text", "source":"And here's a conclusion"}]}

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
    
    // Trigger first submit event AFTER setting the payload to ensure it's accessible externally
    // Use requestAnimationFrame to ensure the state update is flushed before firing the event
    if (isFirstSubmit) {
      firstSubmitFiredRef.current = true
      requestAnimationFrame(() => {
        onFirstSubmit()
      })
    }
    
    onSubmitQuery()
  }

  // Special version of onSubmitQueryCallback for use after restore - doesn't add to history
  const onSubmitQueryCallbackAfterRestore = (message: string, restoredMessages?: Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean; blockId?: number; blockIndex?: number; blockTotal?: number }>) => {
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

    // Inject selected item as hidden assistant message for restored submits as well
    if (selectedItem && Object.keys(selectedItem).length > 0 && !(selectedItem as any)._cleared) {
      // stringify selectedItem and inject as a plain string (remove object/type wrapper)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages.push({
        role: 'assistant' as const,
        content: JSON.stringify(selectedItem),
        hidden: true
      } as any)
    }

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
{"widgets": [{"type":"<type>", "source":"<answer formatted based on the type rules>"}, ...]}

The response MUST be an object with a "widgets" property containing an array.
The widgets array MUST always contain at least one widget object, even if it's just one widget.
When multiple widgets make sense (e.g., text explanation + video + text conclusion), 
return them as separate objects in the widgets array: {"widgets": [{"type":"text", "source":"..."}, {"type":"video", "source":"..."}, {"type":"text", "source":"..."}]}

Example single widget response:
{"widgets": [{"type":"text", "source":"Hello! How can I help you today?"}]}

Example multiple widgets response:
{"widgets": [{"type":"text", "source":"Here's an introduction"}, {"type":"video", "source":"https://example.com/video.mp4"}, {"type":"text", "source":"And here's a conclusion"}]}

HOW TO SELECT THE TYPE DIFFERENT BY TEXT:
If in the user question is present one of the available widget as mentioned TAG, such as @[GoogleMap](google_map), 
then the type should be the widget type, (i.e. google_map).
Otherwise, the type should be always "text".

</TECHNICAL_INSTRUCTIONS_FOR_RESPONSE_FORMAT>`
    }
    
    messages.push(instructionMessage)

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
        hidden?: boolean;
        blockId?: number;
        blockIndex?: number;
        blockTotal?: number;
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
        hidden?: boolean;
        blockId?: number;
        blockIndex?: number;
        blockTotal?: number;
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
        hidden?: boolean;
        blockId?: number;
        blockIndex?: number;
        blockTotal?: number;
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
          const widgetContent = targetMessage.content as { type: string; source: string | Record<string, unknown>; [key: string]: unknown }
          const updatedMessage = {
            ...targetMessage,
            content: {
              ...widgetContent,
              source: {
                ...(widgetContent.source as Record<string, unknown>),
                ...updatedSource
              }
            } as unknown as { type: string; source: string; [key: string]: unknown }
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

  // Dynamic search across all categories in searchData (fuzzy by name)
  const searchDataFn = (query: string) => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    if (!searchData) return [];
    let results: any[] = [];
    Object.entries(searchData).forEach(([key, arr]) => {
      if (Array.isArray(arr)) {
        const matches = arr
          .filter(
            (item): item is { name: string } =>
              !!item &&
              typeof item === 'object' &&
              'name' in item &&
              typeof (item as any).name === 'string' &&
              ((item as any).name || '').toLowerCase().includes(q)
          )
          .slice(0, 10)
          .map(item => ({ ...item, _type: key }));
        results = results.concat(matches);
      }
    });
    return results.slice(0, 10);
  }

  return (
    <>
      {/* Global CSS and Font Assets - managed by plugin system */}
      <GlobalAssets />
      
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Conditionally render SearchBar based on showSearchBar state */}
        {showSearchBar && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', flex: '0 0 auto' }}>
            <SearchBar
              onSearchQuery={searchDataFn}
              onSelectSearchResult={(item) => {
                console.log('SearchBar onSelectSearchResult called with:', item)
                if (item === null) {
                  console.log('Clear signal received, resetting selectedItem')
                  _setSelectedItem({ _cleared: true, timestamp: Date.now() } as any)
                  return
                }
                if (typeof item === 'object' && item !== null) {
                  console.log('Selection made:', item)
                  _setSelectedItem({ ...item, _cleared: false } as any)
                } else {
                  _setSelectedItem({ _cleared: false } as any)
                }
              }}
              selectedItem={selectedItem as Record<string, unknown>}
            />
          </div>
        )}

        {/* Chat area - take remaining space and scroll if needed */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <ChatContainer
            messages={history as Array<{ role: 'user' | 'assistant'; content: string | { type: string; source?: string; [key: string]: unknown }; hidden?: boolean; blockId?: number; blockIndex?: number; blockTotal?: number }>}
            onSubmitQuery={onSubmitQueryCallback}
            isLoading={isLoading}
            onWidgetCallback={onWidgetCallbackHandler}
            onStop={stopPolling}
            promptChips={promptChips as Array<{ icon: string; label: string; question?: string; payload?: Record<string, unknown> }>}
            onChipCallback={onChipCallback}
            onSetChipPayload={(payload: Record<string, unknown>) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              _setChipPayload(payload as any)
            }}
            widgetsOptions={widgetsOptions as Record<string, unknown>}
            tools={tools as Record<string, { tool: string; description: string }>}
            welcomeMessage={welcomeMessage}
            error={error}
            onRetry={retryPolling}
            onDismissError={() => setError(null)}
            placeholder={placeholder}
            componentPreferences={componentPreferences as Record<string, unknown>}
            promotedWidgets={promotedWidgets as Record<string, unknown>}
            onHistoryUpdate={(updatedHistory) => {
              // Update history when ChatContainer modifies it (e.g., pinning/unpinning widgets)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              _setHistory(updatedHistory as any)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              historyRef.current = updatedHistory as any
            }}
          />
        </div>
        
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
