import React, { useState, useMemo } from 'react'
import { type FC } from 'react'

interface ConfirmWidgetProps {
  source: string | { label: string; prompt?: string }
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

/** Parse source that may be string, object, or stringified JSON */
function parseSource(
  source: string | { label: string; prompt?: string }
): { label: string; prompt: string } {
  if (typeof source === 'object' && source !== null) {
    const label = String(source.label ?? 'Confirm')
    const prompt = typeof source.prompt === 'string' ? source.prompt : label
    return { label, prompt }
  }
  const str = String(source)
  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str) as { label?: string; prompt?: string }
      const label = typeof parsed?.label === 'string' ? parsed.label : 'Confirm'
      const prompt = typeof parsed?.prompt === 'string' ? parsed.prompt : label
      return { label, prompt }
    } catch {
      // fall through to plain string
    }
  }
  return { label: str || 'Confirm', prompt: str || 'Confirm' }
}

const ConfirmWidgetComponent: FC<ConfirmWidgetProps> = ({ 
  source, 
  variant = 'primary',
  onWidgetCallback
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const sourceData = useMemo(() => parseSource(source), [source])
  
  const getButtonStyles = () => {
    const variantColors = {
      primary: { bg: '#2563eb', hoverBg: '#1d4ed8', text: '#ffffff' },
      secondary: { bg: '#64748b', hoverBg: '#475569', text: '#ffffff' },
      danger: { bg: '#dc2626', hoverBg: '#b91c1c', text: '#ffffff' }
    }
    const colors = variantColors[variant] ?? variantColors.primary
    return {
      appearance: 'none' as const,
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      padding: '8px 16px',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      backgroundColor: isHovered ? colors.hoverBg : colors.bg,
      color: colors.text,
      boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
    }
  }

  const handleClick = () => {
    if (onWidgetCallback) {
      onWidgetCallback({
        type: 'confirm:changed',
        label: sourceData.label,
        prompt: sourceData.prompt
      })
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <button
      style={getButtonStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label={sourceData.label}
    >
      {sourceData.label}
    </button>
  )
}

// Memoized component to prevent unnecessary re-renders
export const ConfirmWidget = React.memo(ConfirmWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  const prevSource = prevProps.source
  const nextSource = nextProps.source
  
  // Compare source data (string or object)
  if (typeof prevSource === 'string' && typeof nextSource === 'string') {
    return prevSource === nextSource && prevProps.historyIndex === nextProps.historyIndex
  }
  
  if (typeof prevSource === 'object' && typeof nextSource === 'object') {
    return JSON.stringify(prevSource) === JSON.stringify(nextSource) && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  // Different types, allow re-render
  return false
})

// Export the instruction for this widget
export const ConfirmWidgetInstruction = {
  type: 'confirm',
  hint: 'Add a confirmation button to the conversation',
  instructions: 'Use this widget when the user asks to confirm an action or decision. Return an object with label (button text) and prompt (optional, sent in callback on click).',
  sourceDataModel: {
    label: 'string - button label to display',
    prompt: 'string - optional, sent in widgetCallback payload when clicked'
  }
}
