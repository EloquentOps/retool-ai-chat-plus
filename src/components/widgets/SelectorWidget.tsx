import React, { useState } from 'react'
import { type FC } from 'react'

interface SelectorWidgetProps {
  source: Record<string, unknown>
  placeholder?: string
  size?: 'small' | 'medium' | 'large'
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  defaultValue?: string
}

export const SelectorWidget: FC<SelectorWidgetProps> = ({ 
  source,
  size = 'medium',
  onWidgetCallback,
  defaultValue
}) => {
  // Parse the source to extract options and other properties
  const options: Array<{ value: string; label: string }> = source.options as Array<{ value: string; label: string }> || []
  const parsedPlaceholder = source.placeholder || 'Select an option...'
  const parsedDefaultValue = source.defaultValue as string || defaultValue

  const handleSelect = (value: string) => {
    if (onWidgetCallback) {
      const selectedOption = options.find((option: { value: string; label: string }) => option.value === value)
      onWidgetCallback({ 
        selectedValue: value,
        selectedLabel: selectedOption?.label || value,
        widgetType: 'selector:changed'
      })
    }
  }
  const [selectedValue, setSelectedValue] = useState<string>(parsedDefaultValue || '')
  const [isOpen, setIsOpen] = useState(false)

  const getContainerStyles = () => {
    const sizeStyles = {
      small: {
        minHeight: '28px',
        fontSize: '12px'
      },
      medium: {
        minHeight: '36px',
        fontSize: '14px'
      },
      large: {
        minHeight: '44px',
        fontSize: '16px'
      }
    }

    return {
      position: 'relative' as const,
      display: 'inline-block',
      width: '100%',
      maxWidth: '300px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      ...sizeStyles[size]
    }
  }

  const getSelectStyles = () => {
    const sizeStyles = {
      small: {
        padding: '4px 8px',
        minHeight: '28px'
      },
      medium: {
        padding: '8px 12px',
        minHeight: '36px'
      },
      large: {
        padding: '12px 16px',
        minHeight: '44px'
      }
    }

    return {
      width: '100%',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      color: '#374151',
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.2s ease-in-out',
      appearance: 'none' as const,
      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 4 5\'><path fill=\'%23666\' d=\'M2 0L0 2h4zm0 5L0 3h4z\'/></svg>")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center',
      backgroundSize: '12px',
      paddingRight: '32px',
      ...sizeStyles[size]
    }
  }

  const getDropdownStyles = () => {
    return {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: 1000,
      maxHeight: '200px',
      overflowY: 'auto' as const,
      marginTop: '2px'
    }
  }

  const getOptionStyles = (isSelected: boolean) => {
    return {
      padding: '8px 12px',
      cursor: 'pointer',
      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
      color: isSelected ? '#1d4ed8' : '#374151',
      borderBottom: '1px solid #f3f4f6',
      transition: 'all 0.15s ease-in-out',
      fontSize: 'inherit'
    }
  }

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setSelectedValue(value)
    handleSelect(value)
  }

  const handleOptionClick = (value: string) => {
    setSelectedValue(value)
    setIsOpen(false)
    handleSelect(value)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(!isOpen)
    } else if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const _selectedOption = options.find(option => option.value === selectedValue)

  return (
    <div style={getContainerStyles()}>
      <select
        style={getSelectStyles()}
        value={selectedValue}
        onChange={handleSelectChange}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={parsedPlaceholder}
      >
        <option value="">
          {parsedPlaceholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown for better styling (optional enhancement) */}
      {isOpen &&  (
        <div style={getDropdownStyles()}>
          {options.map((option) => (
            <div
              key={option.value}
              style={getOptionStyles(option.value === selectedValue)}
              onClick={() => handleOptionClick(option.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleOptionClick(option.value)
                }
              }}
              tabIndex={0}
              role="option"
              aria-selected={option.value === selectedValue}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Export the instruction for this widget
export const SelectorWidgetInstruction = {
  type: 'selector',
  instructions: `Use this widget when the user is asked to select an option from a given predefined list. 
  If prompt is provided, call the call.`,
  sourceDataModel: {
    placeholder: 'string',
    options: [
      {
        value: 'string',
        label: 'string',
        prompt: 'string'
      }
    ]
  }
}
