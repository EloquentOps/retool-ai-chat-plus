/**
 * Example Widget
 * 
 * This is a template widget that demonstrates the standard structure
 * for creating widget plugins for Retool AI Chat Plus.
 * 
 * Key patterns demonstrated:
 * 1. React.memo for performance optimization
 * 2. Type-safe props interface
 * 3. Widget callback handling
 * 4. Proper export structure
 */

import React, { useState } from 'react'
import type { FC } from 'react'

// ============================================================================
// Types
// ============================================================================

/**
 * Data model for the example widget source
 */
interface ExampleWidgetSource {
  title: string
  content: string
  variant?: 'default' | 'primary' | 'success' | 'warning'
}

/**
 * Props interface - all widgets receive these standard props
 */
interface ExampleWidgetProps {
  /** Main data input - can be string, object, or array */
  source: string | ExampleWidgetSource
  /** Callback for widget interactions */
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  /** Global widget configuration options */
  widgetsOptions?: Record<string, unknown>
  /** Index in message history (for memoization and tracking) */
  historyIndex?: number
}

// ============================================================================
// Styles
// ============================================================================

const getVariantStyles = (variant: string = 'default') => {
  const variants: Record<string, { background: string; border: string; color: string }> = {
    default: {
      background: '#f8f9fa',
      border: '#dee2e6',
      color: '#212529'
    },
    primary: {
      background: '#e7f1ff',
      border: '#0d6efd',
      color: '#0a58ca'
    },
    success: {
      background: '#d1e7dd',
      border: '#198754',
      color: '#0f5132'
    },
    warning: {
      background: '#fff3cd',
      border: '#ffc107',
      color: '#664d03'
    }
  }
  
  return variants[variant] || variants.default
}

// ============================================================================
// Component Implementation
// ============================================================================

const ExampleWidgetComponent: FC<ExampleWidgetProps> = ({
  source,
  onWidgetCallback,
  historyIndex
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  // Parse source data - handle both string and object formats
  let data: ExampleWidgetSource
  
  if (typeof source === 'string') {
    try {
      data = JSON.parse(source)
    } catch {
      // If not JSON, treat as simple content
      data = { title: 'Example', content: source }
    }
  } else {
    data = source as ExampleWidgetSource
  }
  
  const { title, content, variant = 'default' } = data
  const styles = getVariantStyles(variant)
  
  // Handle click interaction
  const handleClick = () => {
    onWidgetCallback?.({
      type: 'example:clicked',
      widgetType: 'example',
      data: data,
      historyIndex,
      timestamp: Date.now()
    })
  }
  
  // Handle action button
  const handleAction = () => {
    onWidgetCallback?.({
      type: 'example:action',
      widgetType: 'example',
      action: 'custom_action',
      data: data,
      historyIndex,
      timestamp: Date.now()
    })
  }
  
  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: styles.background,
        border: `1px solid ${styles.border}`,
        color: styles.color,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600
        }}>
          {title}
        </h3>
        <span style={{
          fontSize: '12px',
          opacity: 0.7,
          textTransform: 'uppercase'
        }}>
          {variant}
        </span>
      </div>
      
      {/* Content */}
      <p style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        lineHeight: 1.5
      }}>
        {content}
      </p>
      
      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleAction()
        }}
        style={{
          padding: '8px 16px',
          borderRadius: '4px',
          border: `1px solid ${styles.border}`,
          backgroundColor: 'white',
          color: styles.color,
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = styles.background
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white'
        }}
      >
        Take Action
      </button>
    </div>
  )
}

// ============================================================================
// Memoized Export
// ============================================================================

/**
 * Memoized widget component to prevent unnecessary re-renders during polling.
 * This is REQUIRED for all widgets to ensure good performance.
 */
export const ExampleWidget = React.memo(ExampleWidgetComponent, (prevProps, nextProps) => {
  // Compare source data
  if (typeof prevProps.source === 'string' && typeof nextProps.source === 'string') {
    return prevProps.source === nextProps.source && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  if (typeof prevProps.source === 'object' && typeof nextProps.source === 'object') {
    return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source) && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  return false
})

// ============================================================================
// Widget Instruction (for AI)
// ============================================================================

/**
 * Widget instruction tells the AI when and how to use this widget.
 * This is injected into the AI prompt when the widget is mentioned.
 */
export const ExampleWidgetInstruction = {
  type: 'example',
  instructions: 'Use this widget when the user asks for an example or demonstration. This widget displays a simple example with customizable content.',
  sourceDataModel: {
    title: 'string - The title to display',
    content: 'string - The main content text',
    variant: 'string (optional) - Style variant: "default" | "primary" | "success" | "warning"'
  }
}

