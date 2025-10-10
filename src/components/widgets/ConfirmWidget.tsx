import React, { useState } from 'react'
import { type FC } from 'react'

interface ConfirmWidgetProps {
  source: string | { label: string; prompt: string; autoSubmit?: boolean }
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

export const ConfirmWidget: FC<ConfirmWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  historyIndex
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  // Parse source to handle both string and object formats
  const sourceData = typeof source === 'string' 
    ? { label: source, prompt: source, autoSubmit: false }
    : source
  
  const getButtonStyles = () => {
    const baseStyles = {
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '500',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)'
    }

    return {
      ...baseStyles,
    }
  }

  const handleClick = () => {
    if (onWidgetCallback) {
      onWidgetCallback({
        type: 'confirm:changed',
        label: sourceData.label,
        selfSubmit: true,
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

// Export the instruction for this widget
export const ConfirmWidgetInstruction = {
  type: 'confirm',
  instructions: 'Use this widget when the user asks to confirm an action or decision.',
  sourceDataModel: {
      label: 'string',
      prompt: 'string.<optional>'
  }
}
