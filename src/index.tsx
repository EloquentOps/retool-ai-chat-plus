import React, { useRef, useState, useEffect } from 'react'
import { type FC } from 'react'

import { Retool } from '@tryretool/custom-component-support'
import { ChatContainer } from './components'
import { getAllWidgetInstructions } from './components/widgets'

export const AiChatPlus: FC = () => {
  // Add state for welcome message
  const [welcomeMessage, _setWelcomeMessage] = Retool.useStateString({
    name: 'welcomeMessage',
    initialValue: ''
  })

  const [widgetsEnabled, _setWidgetsEnabled] = Retool.useStateArray({
    name: 'widgetsEnabled',
    initialValue: []
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
  const currentAgentRunIdRef = useRef<string | null>(null)

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
    
    // Deep comparison to check if values are different
    const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(previousValue)
    
    if (!hasChanged) return
    
    // Update the ref with the current value
    previousSubmitWithPayloadRef.current = { ...currentValue }
    
    // Only proceed if there's actual content
    if (Object.keys(currentValue).length === 0) return

    const { action, payload } = currentValue as { action?: string; payload?: string }

    console.log('submitWithPayload action detected:', action, 'payload:', payload)

    if (action === 'submit' && payload) {
      // Trigger submit with the provided payload
      console.log('Triggering submit with payload:', payload)
      onSubmitQueryCallback(payload)
      // Reset the submitWithPayload to prevent repeated triggers
      _setSubmitWithPayload({})
    } else if (action === 'stop') {
      // Stop the current submit/polling
      console.log('Triggering stop action')
      stopPolling()
      // Reset the submitWithPayload to prevent repeated triggers
      _setSubmitWithPayload({})
    } else {
      console.log('Unknown action or missing payload:', action, payload)
    }
  }, [submitWithPayload])

  // events
  const onSubmitQuery = Retool.useEventCallback({ name: "submitQuery" })
  const onWidgetCallback = Retool.useEventCallback({ name: "widgetCallback" })

  // Polling function to check query status
  const startPolling = (agentRunId: string) => {
    console.log('Starting polling for agentRunId:', agentRunId)
    currentAgentRunIdRef.current = agentRunId
    setIsLoading(true)
    setError(null) // Clear any previous errors
    
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling tick, current agentRunId:', currentAgentRunIdRef.current, 'expected:', agentRunId)
      // Check if we're still polling the same agentRunId
      if (currentAgentRunIdRef.current === agentRunId) {
        try {
          _setAgentInputs({
            action: 'getLogs',
            agentRunId: agentRunId
          })
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
    currentAgentRunIdRef.current = null
    setIsLoading(false)
    console.log('Loading state set to false')
  }

  // Check queryResponse for status changes
  const checkQueryStatus = () => {
    if (!queryResponse || Object.keys(queryResponse).length === 0) return

    // Handle error responses
    if (queryResponse.status === 'ERROR' || queryResponse.error) {
      const errorMessage = queryResponse.error || queryResponse.message || 'An error occurred while processing your request'
      setError(errorMessage as string)
      stopPolling()
      return
    }

    // Handle initial invoke response - get agentRunId and start polling
    if (queryResponse.agentRunId && queryResponse.status === 'PENDING' && !isLoading) {
      startPolling(queryResponse.agentRunId as string)
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
  }

  // Check status on every render
  checkQueryStatus()

  // Retry function to restart polling
  const retryPolling = () => {
    if (currentAgentRunIdRef.current) {
      console.log('Retrying polling for agentRunId:', currentAgentRunIdRef.current)
      setError(null)
      startPolling(currentAgentRunIdRef.current)
    }
  }

  // Function to normalize message content for agent input
  // Uses standardized format: {type: "text", source: "content"}
  const normalizeMessageForAgent = (message: { role: 'user' | 'assistant'; content: string | { type: string; source: string; [key: string]: unknown } }) => {
    if (typeof message.content === 'string') {
      return message
    }
    
    // Extract plain text from standardized JSON objects
    const jsonContent = message.content as { type: string; source: string; [key: string]: unknown }
    
    return {
      role: message.role,
      content: jsonContent.source
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
    const widgetInstructions = getAllWidgetInstructions(widgetsEnabled as string[], widgetsOptions)
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
          messages={history as Array<{ role: 'user' | 'assistant'; content: string | { type: string; source: string; [key: string]: unknown } }>}
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
      </div>
    </>
  )
}
