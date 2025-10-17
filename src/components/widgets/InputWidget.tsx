import React, { useState, useEffect } from 'react'
import { type FC } from 'react'

interface InputWidgetProps {
  source: string | { 
    placeholder?: string
    validationRegex?: string
    validMessage?: string
    invalidMessage?: string
    initialValue?: string
  }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

export const InputWidget: FC<InputWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  historyIndex: _historyIndex
}) => {
  // Parse source to handle both string and object formats
  const sourceData = typeof source === 'string' 
    ? { 
        placeholder: source, 
        validationRegex: '', 
        validMessage: 'Valid input', 
        invalidMessage: 'Invalid input',
        initialValue: ''
      }
    : {
        placeholder: source.placeholder || 'Enter text...',
        validationRegex: source.validationRegex || '',
        validMessage: source.validMessage || 'Valid input',
        invalidMessage: source.invalidMessage || 'Invalid input',
        initialValue: source.initialValue || ''
      }

  const [inputValue, setInputValue] = useState(sourceData.initialValue)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState('')

  // Validate input whenever it changes
  useEffect(() => {
    if (sourceData.validationRegex && inputValue !== '') {
      try {
        const regex = new RegExp(sourceData.validationRegex)
        const valid = regex.test(inputValue)
        setIsValid(valid)
        setValidationMessage(valid ? sourceData.validMessage : sourceData.invalidMessage)
        
      } catch (error) {
        // Invalid regex pattern
        setIsValid(false)
        setValidationMessage('Invalid regex pattern')
        
      }
    } else if (inputValue === '') {
      // Reset validation state when input is empty
      setIsValid(null)
      setValidationMessage('')
     
    }
  }, [inputValue, sourceData.validationRegex, sourceData.validMessage, sourceData.invalidMessage, onWidgetCallback])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
 
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Submit the value to the callback and update history object
      if (onWidgetCallback) {
        onWidgetCallback({
          type: 'input:submitted',
          value: inputValue,
          isValid: isValid,
          validationMessage: validationMessage,
          selfSubmit: true,
          updateHistory: true,
          historyIndex: _historyIndex,
          updatedSource: {
            value: inputValue
          }
        })
      }
    }
  }

  const getInputStyles = () => {
    const baseStyles = {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      outline: 'none',
      transition: 'all 0.2s ease-in-out',
      backgroundColor: '#ffffff'
    }

    // Style based on validation state
    if (isValid === true) {
      return {
        ...baseStyles,
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4'
      }
    } else if (isValid === false) {
      return {
        ...baseStyles,
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2'
      }
    }

    return baseStyles
  }

  const getMessageStyles = () => {
    if (isValid === true) {
      return {
        color: '#059669',
        fontSize: '12px',
        marginTop: '4px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
    } else if (isValid === false) {
      return {
        color: '#dc2626',
        fontSize: '12px',
        marginTop: '4px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }
    }

    return {
      color: '#6b7280',
      fontSize: '12px',
      marginTop: '4px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={sourceData.placeholder}
        style={getInputStyles()}
        aria-label={sourceData.placeholder}
        aria-describedby={validationMessage ? 'validation-message' : undefined}
      />
      {validationMessage && (
        <div 
          id="validation-message"
          style={getMessageStyles()}
          role="status"
          aria-live="polite"
        >
          {validationMessage}
        </div>
      )}
      <div style={{
        fontSize: '11px',
        color: '#9ca3af',
        marginTop: '8px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        Press Enter to confirm
      </div>
    </div>
  )
}

// Export the instruction for this widget
export const InputWidgetInstruction = {
  type: 'input',
  instructions: 'Use this when the user needs to input some value with specific validation.',
  sourceDataModel: {
    value: 'string',
    placeholder: 'string (optional) - placeholder for the input field',
    validationRegex: 'string (optional) - regex pattern for validation',
    validMessage: 'string (optional) - message shown when input is valid',
    invalidMessage: 'string (optional) - message shown when input is invalid',
    initialValue: 'string (optional) - initial value for the input field'
  }
}
