import React, { useEffect, useRef, useState, useCallback } from 'react'
import { type FC } from 'react'
import mermaid from 'mermaid'

interface MermaidWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

// Track if mermaid has been initialized globally
let mermaidInitialized = false

const MermaidWidgetComponent: FC<MermaidWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  widgetsOptions,
  historyIndex: _historyIndex 
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mermaidDivRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [diagramId] = useState(() => `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Get theme from widget options
  type MermaidTheme = 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null'
  const themeOption = (widgetsOptions?.mermaid as Record<string, unknown>)?.theme as string || 'default'
  const validThemes: MermaidTheme[] = ['default', 'base', 'dark', 'forest', 'neutral', 'null']
  const theme: MermaidTheme = validThemes.includes(themeOption as MermaidTheme) ? themeOption as MermaidTheme : 'default'

  // Initialize mermaid once globally
  const initMermaid = useCallback(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        securityLevel: 'loose',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      })
      mermaidInitialized = true
    }
  }, [theme])

  // Render the diagram using init pattern (like the working script)
  const renderDiagram = useCallback(async (code: string) => {
    if (!containerRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // Initialize mermaid if needed
      initMermaid()

      // Clear previous content
      containerRef.current.innerHTML = ''

      // Create a new div for the diagram
      const newGraphDiv = document.createElement('div')
      newGraphDiv.setAttribute('id', diagramId)
      newGraphDiv.classList.add('mermaid')
      newGraphDiv.innerHTML = code.trim()

      containerRef.current.appendChild(newGraphDiv)
      mermaidDivRef.current = newGraphDiv

      // Use mermaid.init() or mermaid.run() to render - this is the pattern from the working script
      // mermaid.init() is for older versions, mermaid.run() is for v10+
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mermaidAny = mermaid as any
      if (typeof mermaidAny.run === 'function') {
        // v10+ API
        await mermaidAny.run({ nodes: [newGraphDiv] })
      } else if (typeof mermaidAny.init === 'function') {
        // Legacy API
        await mermaidAny.init(undefined, newGraphDiv)
      } else {
        throw new Error('Mermaid render method not available')
      }

      // After rendering, ensure SVG fills container properly
      const svgElement = newGraphDiv.querySelector('svg')
      if (svgElement) {
        svgElement.style.maxWidth = '100%'
        svgElement.style.height = 'auto'
        svgElement.style.display = 'block'
      }

      setIsLoading(false)

      // Trigger callback on successful render
      onWidgetCallback?.({
        type: 'mermaid:rendered',
        diagramId: diagramId,
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
  }, [diagramId, initMermaid, onWidgetCallback])

  useEffect(() => {
    // Validate source
    if (!source) {
      setError('No diagram code provided')
      setIsLoading(false)
      return
    }

    if (typeof source !== 'string' || source.trim().length === 0) {
      setError('Invalid mermaid diagram: source must be a non-empty string')
      setIsLoading(false)
      return
    }

    renderDiagram(source)

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      mermaidDivRef.current = null
    }
  }, [source, renderDiagram])

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
      overflow: 'auto',
      minHeight: '200px'
    }}>
      {isLoading && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          color: '#666',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div>⏳</div>
          <div>Loading diagram...</div>
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%',
          display: isLoading ? 'none' : 'block'
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

