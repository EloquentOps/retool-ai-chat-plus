import React, { useState, useEffect, useRef } from 'react'
import { type FC } from 'react'

interface AppWidgetProps {
  source: string | { html?: string; height?: string; width?: string }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

/**
 * Checks if a string is likely base64-encoded
 * @param str - String to check
 * @returns True if string appears to be base64-encoded
 */
function isBase64(str: string): boolean {
  // Base64 strings are alphanumeric + / + = and typically don't contain HTML tags
  // Check for base64 pattern and absence of HTML tags
  const base64Pattern = /^[A-Za-z0-9+/=\s]+$/
  return base64Pattern.test(str) && !str.includes('<') && !str.includes('>')
}

/**
 * Safely decodes a base64 string to HTML
 * @param base64Str - Base64-encoded string
 * @returns Decoded HTML string, or original string if decoding fails
 */
function decodeBase64Html(base64Str: string): string {
  try {
    // Remove whitespace
    const cleanBase64 = base64Str.trim().replace(/\s/g, '')
    // Decode base64
    const decoded = decodeURIComponent(escape(atob(cleanBase64)))
    // Check if decoded result looks like HTML
    if (/<[^>]+>/.test(decoded)) {
      return decoded
    }
    // Doesn't look like HTML, return original
    return base64Str
  } catch (error) {
    // Decoding failed, return original string
    console.warn('Failed to decode base64 HTML:', error)
    return base64Str
  }
}

const AppWidgetComponent: FC<AppWidgetProps> = ({
  source,
  onWidgetCallback,
  widgetsOptions,
  historyIndex: _historyIndex
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const modalWindowRef = useRef<Window | null>(null)

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

      if (typeof source === 'string') {
        html = source
      } else if (typeof source === 'object' && source !== null) {
        html = (source as { html?: string }).html || ''
      }

      if (!html || html.trim() === '') {
        setError('Empty HTML content provided')
        setIsLoading(false)
        return
      }

      // Check if HTML is base64-encoded and decode if necessary
      let decodedHtml = html
      if (isBase64(html)) {
        decodedHtml = decodeBase64Html(html)
        // If decoding didn't produce HTML (failed or wasn't actually base64), use original
        if (decodedHtml === html && !/<[^>]+>/.test(html)) {
          // Original wasn't HTML, might be plain text - use as is
          decodedHtml = html
        }
      }

      setHtmlContent(decodedHtml)
      setIsLoading(false)
    } catch (err) {
      setError(`Failed to process HTML content: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }, [source, widgetsOptions])

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false)
    
    // Notify that the app has loaded
    onWidgetCallback?.({
      type: 'app:loaded',
      timestamp: Date.now()
    })
  }

  // Handle iframe errors
  const handleIframeError = () => {
    setError('Failed to load HTML content in iframe')
    setIsLoading(false)
    onWidgetCallback?.({
      type: 'app:error',
      error: 'iframe_load_error',
      timestamp: Date.now()
    })
  }

  // Extract dimensions from widgetsOptions or source
  const getDimensions = () => {
    const appOptions = widgetsOptions?.app as { height?: string; width?: string } | undefined
    const defaultHeight = appOptions?.height || '400px'
    const defaultWidth = appOptions?.width || '100%'

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

  // Open app in standalone modal window
  const handleOpenStandalone = () => {
    if (!htmlContent) {
      setError('No HTML content available to open')
      return
    }

    try {
      // Open a new window
      const newWindow = window.open('', '_blank', 'width=400,height=400,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes')
      
      if (!newWindow) {
        setError('Failed to open new window. Please check your popup blocker settings.')
        onWidgetCallback?.({
          type: 'app:error',
          error: 'popup_blocked',
          timestamp: Date.now()
        })
        return
      }

      modalWindowRef.current = newWindow
      setIsModalOpen(true)

      // Write the HTML content to the new window
      newWindow.document.open()
      newWindow.document.write(htmlContent)
      newWindow.document.close()

      // Set window title
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i)
      if (titleMatch) {
        newWindow.document.title = titleMatch[1]
      } else {
        newWindow.document.title = 'Standalone App'
      }

      // Handle window close
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed)
          setIsModalOpen(false)
          modalWindowRef.current = null
          onWidgetCallback?.({
            type: 'app:standalone_closed',
            timestamp: Date.now()
          })
        }
      }, 500)

      // Notify that standalone window was opened
      onWidgetCallback?.({
        type: 'app:standalone_opened',
        timestamp: Date.now()
      })
    } catch (err) {
      setError(`Failed to open standalone window: ${err instanceof Error ? err.message : 'Unknown error'}`)
      onWidgetCallback?.({
        type: 'app:error',
        error: 'standalone_open_error',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now()
      })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modalWindowRef.current && !modalWindowRef.current.closed) {
        modalWindowRef.current.close()
      }
    }
  }, [])

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
        <div style={{ fontSize: '14px' }}>Loading app...</div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      position: 'relative',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '8px 12px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        gap: '8px'
      }}>
        <button
          onClick={handleOpenStandalone}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            color: '#374151',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
            e.currentTarget.style.borderColor = '#9ca3af'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
            e.currentTarget.style.borderColor = '#d1d5db'
          }}
          title="Open in standalone window"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>Open Standalone</span>
        </button>
      </div>

      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '41px', // Account for toolbar height
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
        title="App Widget"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const AppWidget = React.memo(AppWidgetComponent, (prevProps, nextProps) => {
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
export const AppWidgetInstruction = {
  type: 'app',
  instructions: 'Use this widget when you need to render a standalone web application with HTML, CSS, and JavaScript. Similar to the canvas widget, but includes a toolbar with an option to open the app in a separate browser window for a full-screen, standalone experience. Perfect for interactive web apps, demos, or any HTML-based application that users might want to run independently. The HTML can include inline styles, scripts, and external resources. Always provide a complete, valid HTML document structure.',
  sourceDataModel: {
    html: 'Complete HTML document as a string. Can include <!DOCTYPE html>, <html>, <head> with <style> and <script> tags, and <body> with any HTML content. Example: "<!DOCTYPE html><html><head><style>body { margin: 0; padding: 20px; }</style></head><body><h1>Hello World</h1></body></html>"',
    //height: 'Optional: Height of the iframe (e.g., "400px", "50vh", "100%"). Default: "400px"',
    //width: 'Optional: Width of the iframe (e.g., "100%", "800px"). Default: "100%"'
  }
}
