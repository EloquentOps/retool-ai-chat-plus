import React, { useState, useEffect, useRef } from 'react'
import { type FC } from 'react'

interface CanvasWidgetProps {
  source: string | { html?: string; height?: string; width?: string }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const CanvasWidgetComponent: FC<CanvasWidgetProps> = ({
  source,
  onWidgetCallback,
  widgetsOptions,
  historyIndex
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Extract HTML content from source
  useEffect(() => {
    try {
      setIsLoading(true)
      setError(null)

      if (!source) {
        setError('No HTML content provided')
        setIsLoading(false)
        return
      }

      let html = ''
      let height = widgetsOptions?.canvas?.height || '400px'
      let width = widgetsOptions?.canvas?.width || '100%'

      if (typeof source === 'string') {
        html = source
      } else if (typeof source === 'object' && source !== null) {
        html = (source as { html?: string }).html || ''
        height = (source as { height?: string }).height || height
        width = (source as { width?: string }).width || width
      }

      if (!html || html.trim() === '') {
        setError('Empty HTML content provided')
        setIsLoading(false)
        return
      }

      setHtmlContent(html)
      setIsLoading(false)
    } catch (err) {
      setError(`Failed to process HTML content: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }, [source, widgetsOptions])

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false)
    
    // Notify that the canvas has loaded
    onWidgetCallback?.({
      type: 'canvas:loaded',
      timestamp: Date.now()
    })
  }

  // Handle iframe errors
  const handleIframeError = () => {
    setError('Failed to load HTML content in iframe')
    setIsLoading(false)
    onWidgetCallback?.({
      type: 'canvas:error',
      error: 'iframe_load_error',
      timestamp: Date.now()
    })
  }

  // Extract dimensions from widgetsOptions or source
  const getDimensions = () => {
    const defaultHeight = widgetsOptions?.canvas?.height || '400px'
    const defaultWidth = widgetsOptions?.canvas?.width || '100%'

    if (typeof source === 'object' && source !== null) {
      return {
        height: (source as { height?: string }).height || defaultHeight,
        width: (source as { width?: string }).width || defaultWidth
      }
    }

    return {
      height: defaultHeight,
      width: defaultWidth
    }
  }

  const { height, width } = getDimensions()

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '8px' }}>❌</div>
        <div style={{ fontSize: '14px' }}>{error}</div>
      </div>
    )
  }

  if (isLoading && !htmlContent) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666666'
      }}>
        <div style={{ marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '14px' }}>Loading canvas...</div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      //maxWidth: '650px',
      position: 'relative',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', color: '#666666' }}>
            <div style={{ marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '14px' }}>Rendering HTML...</div>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        style={{
          width: width,
          height: height,
          border: 'none',
          display: 'block'
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        title="Canvas Widget"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const CanvasWidget = React.memo(CanvasWidgetComponent, (prevProps, nextProps) => {
  // Compare source content
  if (typeof prevProps.source === 'string' && typeof nextProps.source === 'string') {
    return prevProps.source === nextProps.source && prevProps.historyIndex === nextProps.historyIndex
  }

  if (typeof prevProps.source === 'object' && typeof nextProps.source === 'object') {
    return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source) &&
      prevProps.historyIndex === nextProps.historyIndex
  }

  // Different types, allow re-render
  return false
})

// Export the instruction for this widget
export const CanvasWidgetInstruction = {
  type: 'canvas',
  instructions: 'Use this widget when you need to render custom HTML content, interactive elements, or any web-based visualization that cannot be achieved with other specialized widgets. This widget accepts complete HTML documents (including CSS and JavaScript) and renders them in an isolated iframe. Perfect for custom visualizations, interactive demos, embedded web apps, or any HTML-based content. The HTML can include inline styles, scripts, and external resources. Always provide a complete, valid HTML document structure.',
  sourceDataModel: {
    html: 'Complete HTML document as a string. Can include <!DOCTYPE html>, <html>, <head> with <style> and <script> tags, and <body> with any HTML content. Example: "<!DOCTYPE html><html><head><style>body { margin: 0; padding: 20px; }</style></head><body><h1>Hello World</h1></body></html>"',
    //height: 'Optional: Height of the iframe (e.g., "400px", "50vh", "100%"). Default: "400px"',
    //width: 'Optional: Width of the iframe (e.g., "100%", "800px"). Default: "100%"'
  }
}
