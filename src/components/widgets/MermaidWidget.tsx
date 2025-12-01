import React, { useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import mermaid from 'mermaid'

interface MermaidWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const MermaidWidgetComponent: FC<MermaidWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  widgetsOptions,
  historyIndex: _historyIndex 
}) => {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Default options
  const defaultOptions = {
    theme: 'default' as const,
    startOnLoad: false,
    securityLevel: 'loose' as const,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  // Merge with widget options
  const effectiveOptions = React.useMemo(() => ({
    ...defaultOptions,
    ...(widgetsOptions?.mermaid as Record<string, unknown> || {})
  }), [widgetsOptions?.mermaid])

  useEffect(() => {
    if (!mermaidRef.current || !source) {
      setIsLoading(false)
      return
    }

    // Validate source is a string
    if (typeof source !== 'string' || source.trim().length === 0) {
      setError('Invalid mermaid diagram: source must be a non-empty string')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Initialize mermaid if not already initialized
    const initializeMermaid = async () => {
      try {
        // Initialize mermaid with options
        mermaid.initialize({
          theme: effectiveOptions.theme,
          startOnLoad: effectiveOptions.startOnLoad,
          securityLevel: effectiveOptions.securityLevel,
          fontFamily: effectiveOptions.fontFamily as string
        })

        // Generate a unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Clear previous content
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = ''
        }

        // Render the mermaid diagram
        const { svg } = await mermaid.render(id, source.trim())
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg
          
          // Ensure SVG fills container properly
          const svgElement = mermaidRef.current.querySelector('svg')
          if (svgElement) {
            svgElement.style.maxWidth = '100%'
            svgElement.style.height = 'auto'
            svgElement.style.display = 'block'
          }
        }

        setIsLoading(false)

        // Trigger callback on successful render
        onWidgetCallback?.({
          type: 'mermaid:rendered',
          diagramId: id,
          timestamp: Date.now()
        })

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`Failed to render mermaid diagram: ${errorMessage}`)
        setIsLoading(false)
        console.error('MermaidWidget rendering error:', err)
        
        // Trigger callback on error
        onWidgetCallback?.({
          type: 'mermaid:error',
          error: errorMessage,
          timestamp: Date.now()
        })
      }
    }

    initializeMermaid()

    // Cleanup function
    return () => {
      // Mermaid doesn't require explicit cleanup, but we can clear the ref
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = ''
      }
    }
  }, [source, effectiveOptions, onWidgetCallback])

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div>⏳</div>
        <div>Loading diagram...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div>❌</div>
        <div style={{ marginTop: '8px', textAlign: 'center' }}>{error}</div>
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#991b1b',
          fontFamily: 'monospace',
          backgroundColor: '#fee2e2',
          padding: '8px',
          borderRadius: '4px',
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          {source.substring(0, 200)}{source.length > 200 ? '...' : ''}
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100%',
      padding: '16px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'auto'
    }}>
      <div 
        ref={mermaidRef} 
        style={{ 
          width: '100%',
          display: 'block'
        }}
      />
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const MermaidWidget = React.memo(MermaidWidgetComponent, (prevProps, nextProps) => {
  // Compare source data (string)
  if (prevProps.source !== nextProps.source) {
    return false // Source changed, allow re-render
  }
  
  // Compare widgetsOptions for mermaid specific settings
  const prevOptions = prevProps.widgetsOptions?.mermaid as Record<string, unknown>
  const nextOptions = nextProps.widgetsOptions?.mermaid as Record<string, unknown>
  
  if (JSON.stringify(prevOptions) !== JSON.stringify(nextOptions)) {
    return false // Options changed, allow re-render
  }
  
  // Compare historyIndex
  if (prevProps.historyIndex !== nextProps.historyIndex) {
    return false // History index changed, allow re-render
  }
  
  // Props are the same, prevent re-render
  return true
})

// Export the instruction for this widget
export const MermaidWidgetInstruction = {
  type: 'mermaid',
  instructions: 'Use this widget when the user requests to visualize diagrams, flowcharts, sequence diagrams, class diagrams, state diagrams, entity relationship diagrams, Gantt charts, pie charts, git graphs, or any other diagram format that can be represented using Mermaid syntax. Perfect for displaying process flows, system architectures, relationships, timelines, and structured visualizations.',
  sourceDataModel: 'string - A valid Mermaid diagram syntax string. Examples:\n- Flowchart: "graph TD\\n    A[Start] --> B[Process]\\n    B --> C[End]"\n- Sequence diagram: "sequenceDiagram\\n    participant A\\n    participant B\\n    A->>B: Message"\n- Class diagram: "classDiagram\\n    class Animal\\n    class Dog\\n    Animal <|-- Dog"\n- State diagram: "stateDiagram-v2\\n    [*] --> State1\\n    State1 --> State2"\n- Gantt chart: "gantt\\n    title Project Timeline\\n    section Phase1\\n    Task1: 2024-01-01, 30d"\n- Pie chart: "pie title Distribution\\n    "Category1": 30\\n    "Category2": 70"'
}

