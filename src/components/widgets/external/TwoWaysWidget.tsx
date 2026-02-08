import React, { useState, useEffect, useRef } from 'react'
import { type FC } from 'react'

interface TwoWaysWidgetProps {
  source: string | { label?: string; value?: string }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const TwoWaysWidgetComponent: FC<TwoWaysWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  widgetsOptions,
  historyIndex
}) => {
  // Parse source to handle string, JSON string, and object formats
  // This is called on every render to ensure reactivity to source changes
  const parseSource = (src: string | { label?: string; value?: string }): { label: string; value: string } => {
    if (typeof src === 'string') {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(src)
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            label: parsed.label || 'Generate Random Number',
            value: parsed.value || ''
          }
        }
      } catch {
        // Not valid JSON, treat as plain string label
      }
      // Plain string - use as label
      return { label: src, value: '' }
    } else {
      // Already an object
      return {
        label: src.label || 'Generate Random Number',
        value: src.value || ''
      }
    }
  }
  
  // Parse source on every render to ensure label and value are always up-to-date
  const sourceData = parseSource(source)

  // State for the text field value
  const [textValue, setTextValue] = useState<string>(sourceData.value)
  
  // Track previous value to detect changes
  const prevValueRef = useRef<string>(sourceData.value)

  // React to value changes in source prop
  useEffect(() => {
    // Parse source to get current value (handling JSON strings)
    const parsed = parseSource(source)
    const currentValue = parsed.value
    
    // Only update if value actually changed
    if (currentValue !== prevValueRef.current) {
      prevValueRef.current = currentValue
      setTextValue(currentValue)
    }
  }, [source])

  // Sync from Retool via widgetsOptions
  useEffect(() => {
    // Check if widgetsOptions has a value for this widget
    const widgetOptions = widgetsOptions?.two_ways as { value?: string | number } | undefined
    if (widgetOptions?.value !== undefined) {
      // Convert to string if it's a number
      const newValue = String(widgetOptions.value)
      setTextValue(prevValue => {
        // Only update if the value actually changed
        if (newValue !== prevValue) {
          return newValue
        }
        return prevValue
      })
    }
  }, [widgetsOptions])

  // Generate random number and update both state and send callback
  const handleButtonClick = () => {
    const randomNumber = Math.floor(Math.random() * 1000000) // Random number between 0 and 999999
    const randomNumberString = String(randomNumber)
    
    // Update the text field
    setTextValue(randomNumberString)
    
    onWidgetCallback?.({ type: 'two_ways:number_generated', value: randomNumber })
  }

  const getInputStyles = () => {
    return {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      outline: 'none',
      transition: 'all 0.2s ease-in-out',
      backgroundColor: '#ffffff',
      marginBottom: '12px'
    }
  }

  const getButtonStyles = () => {
    return {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      fontSize: '14px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      outline: 'none'
    }
  }

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '400px',
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
        Two-Way Sync Widget
      </div>
      <input
        type="text"
        value={textValue}
        readOnly
        style={getInputStyles()}
        aria-label="Random number display"
        placeholder="Click button to generate a number"
      />
      <button
        onClick={handleButtonClick}
        style={getButtonStyles()}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6'
        }}
        aria-label={sourceData.label}
      >
        {sourceData.label}
      </button>
      <div style={{
        fontSize: '11px',
        color: '#9ca3af',
        marginTop: '12px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        Widget → Retool: Click button to send number via callback
        <br />
        Retool → Widget: Set widgetsOptions.two_ways.value to sync number
      </div>
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const TwoWaysWidget = React.memo(TwoWaysWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  const prevSource = prevProps.source
  const nextSource = nextProps.source
  
  // Helper to extract value from source (handling JSON strings)
  const extractValue = (src: string | { label?: string; value?: string }): string => {
    if (typeof src === 'string') {
      try {
        const parsed = JSON.parse(src)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.value || ''
        }
      } catch {
        return ''
      }
      return ''
    }
    return src.value || ''
  }
  
  // Helper to extract label from source (handling JSON strings)
  const extractLabel = (src: string | { label?: string; value?: string }): string => {
    if (typeof src === 'string') {
      try {
        const parsed = JSON.parse(src)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.label || 'Generate Random Number'
        }
      } catch {
        return src
      }
      return src
    }
    return src.label || 'Generate Random Number'
  }
  
  // Compare source data - handle strings and objects differently
  // Extract label and value from both sources for comparison
  const prevValue = extractValue(prevSource)
  const nextValue = extractValue(nextSource)
  const prevLabel = extractLabel(prevSource)
  const nextLabel = extractLabel(nextSource)
  
  // Compare both value and label - if either changed, we need to re-render
  const sourceEqual = prevValue === nextValue && prevLabel === nextLabel

  // Compare widgetsOptions for two_ways.value
  const prevWidgetOptions = prevProps.widgetsOptions?.two_ways as { value?: string | number } | undefined
  const nextWidgetOptions = nextProps.widgetsOptions?.two_ways as { value?: string | number } | undefined
  const widgetOptionsEqual = prevWidgetOptions?.value === nextWidgetOptions?.value

  // Compare historyIndex
  const historyIndexEqual = prevProps.historyIndex === nextProps.historyIndex

  // Return true if props are equal (don't re-render), false if different (re-render)
  // Re-render if source changed (label or value), widgetOptions changed, or historyIndex changed
  return sourceEqual && widgetOptionsEqual && historyIndexEqual
})

// Export the instruction for this widget
export const TwoWaysWidgetInstruction = {
  type: 'two_ways',
  instructions: 'Use this widget to test two-way synchronization between the widget and Retool components. The widget displays a number that can be set from both the widget (via button click) and from Retool (via widgetsOptions).',
  sourceDataModel: {
    label: 'string (optional) - label for the generate button, defaults to "Generate Random Number"',
    value: 'string (optional) - value for the text field (used for both initial and updates)'
  }
}
