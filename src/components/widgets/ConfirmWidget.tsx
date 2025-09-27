import React, { useState } from 'react'
import { type FC } from 'react'

interface ConfirmWidgetProps {
  source: string
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

export const ConfirmWidget: FC<ConfirmWidgetProps> = ({ 
  source, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onWidgetCallback
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const getButtonStyles = () => {
    const baseStyles = {
      border: 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '500',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transform: isHovered && !disabled ? 'scale(1.05)' : 'scale(1)'
    }

    const sizeStyles = {
      small: {
        padding: '6px 12px',
        fontSize: '12px',
        minHeight: '28px'
      },
      medium: {
        padding: '8px 16px',
        fontSize: '14px',
        minHeight: '36px'
      },
      large: {
        padding: '12px 24px',
        fontSize: '16px',
        minHeight: '44px'
      }
    }

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? '#e5e7eb' : (isHovered ? '#2563eb' : '#3b82f6'),
        color: disabled ? '#9ca3af' : '#ffffff'
      },
      secondary: {
        backgroundColor: disabled ? '#f3f4f6' : (isHovered ? '#f9fafb' : '#ffffff'),
        color: disabled ? '#9ca3af' : '#374151',
        border: '1px solid',
        borderColor: disabled ? '#d1d5db' : (isHovered ? '#9ca3af' : '#d1d5db')
      },
      danger: {
        backgroundColor: disabled ? '#fecaca' : (isHovered ? '#dc2626' : '#ef4444'),
        color: disabled ? '#fca5a5' : '#ffffff'
      }
    }

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant]
    }
  }

  const handleClick = () => {
    if (!disabled && onWidgetCallback) {
      onWidgetCallback({})
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <button
      style={getButtonStyles()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={source}
    >
      {source}
    </button>
  )
}

// Export the instruction for this widget
export const ConfirmWidgetInstruction = `- **Format type: "confirm"**:
The source value should be the button text to display.
Optional properties:
- variant: "primary" | "secondary" | "danger" (default: "primary")
- size: "small" | "medium" | "large" (default: "medium")
- disabled: boolean (default: false)

Example: {"type": "confirm", "source": "Save Changes", "variant": "primary", "size": "medium", "disabled": false}`
