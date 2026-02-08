import React, { useState, useEffect, useRef } from 'react'
import { type FC } from 'react'

interface InputWidgetProps {
  source: string | { 
    placeholder?: string
    validationRegex?: string
    validMessage?: string
    invalidMessage?: string
    currentValue?: string
    inputType?: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'time' | 'url' | 'tel' | 'password'
    fieldName?: string
    min?: number
    max?: number
    step?: number
  }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

// Helper function to detect input type based on field name or placeholder
const detectInputType = (fieldName?: string, placeholder?: string): string => {
  const text = `${fieldName || ''} ${placeholder || ''}`.toLowerCase()
  
  if (text.includes('email') || text.includes('mail')) return 'email'
  if (text.includes('phone') || text.includes('tel') || text.includes('mobile')) return 'tel'
  if (text.includes('url') || text.includes('website') || text.includes('link')) return 'url'
  if (text.includes('password') || text.includes('pass')) return 'password'
  if (text.includes('date') && !text.includes('time')) return 'date'
  if (text.includes('time') && !text.includes('date')) return 'time'
  if (text.includes('datetime') || (text.includes('date') && text.includes('time'))) return 'datetime-local'
  if (text.includes('number') || text.includes('amount') || text.includes('quantity') || text.includes('count')) return 'number'
  
  return 'text'
}

// Helper function to validate input based on type
const validateByType = (value: string, inputType: string): { isValid: boolean; message: string } => {
  if (!value) return { isValid: true, message: '' }
  
  switch (inputType) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return {
        isValid: emailRegex.test(value),
        message: emailRegex.test(value) ? 'Valid email address' : 'Please enter a valid email address'
      }
    
    case 'url':
      try {
        new URL(value)
        return { isValid: true, message: 'Valid URL' }
      } catch {
        return { isValid: false, message: 'Please enter a valid URL' }
      }
    
    case 'tel':
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '')
      return {
        isValid: phoneRegex.test(cleanPhone),
        message: phoneRegex.test(cleanPhone) ? 'Valid phone number' : 'Please enter a valid phone number'
      }
    
    case 'number':
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        return { isValid: false, message: 'Please enter a valid number' }
      }
      return { isValid: true, message: 'Valid number' }
    
    case 'date':
      const date = new Date(value)
      return {
        isValid: !isNaN(date.getTime()),
        message: !isNaN(date.getTime()) ? 'Valid date' : 'Please enter a valid date'
      }
    
    case 'time':
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
      return {
        isValid: timeRegex.test(value),
        message: timeRegex.test(value) ? 'Valid time' : 'Please enter a valid time (HH:MM or HH:MM:SS)'
      }
    
    case 'datetime-local':
      const dateTime = new Date(value)
      return {
        isValid: !isNaN(dateTime.getTime()),
        message: !isNaN(dateTime.getTime()) ? 'Valid date and time' : 'Please enter a valid date and time'
      }
    
    default:
      return { isValid: true, message: '' }
  }
}

const InputWidgetComponent: FC<InputWidgetProps> = ({ 
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
        currentValue: '',
        inputType: detectInputType(undefined, source),
        fieldName: undefined,
        min: undefined,
        max: undefined,
        step: undefined
      }
    : {
        placeholder: source.placeholder || 'Enter text...',
        validationRegex: source.validationRegex || '',
        validMessage: source.validMessage || 'Valid input',
        invalidMessage: source.invalidMessage || 'Invalid input',
        currentValue: source.currentValue || '',
        inputType: source.inputType || detectInputType(source.fieldName, source.placeholder),
        fieldName: source.fieldName,
        min: source.min,
        max: source.max,
        step: source.step
      }

  const [inputValue, setInputValue] = useState(sourceData.currentValue)
  const prevCurrentValueRef = useRef<string>(sourceData.currentValue)

  // Sync from source when currentValue changes (e.g. from history update or external)
  useEffect(() => {
    const currentValue = sourceData.currentValue || ''
    if (currentValue !== prevCurrentValueRef.current) {
      prevCurrentValueRef.current = currentValue
      setInputValue(currentValue)
    }
  }, [sourceData.currentValue])
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [validationMessage, setValidationMessage] = useState('')

  // Validate input whenever it changes
  useEffect(() => {
    if (inputValue === '') {
      // Reset validation state when input is empty
      setIsValid(null)
      setValidationMessage('')
      return
    }

    // First, validate by input type
    const typeValidation = validateByType(inputValue, sourceData.inputType)
    
    // If custom regex is provided, also validate with that
    if (sourceData.validationRegex) {
      try {
        const regex = new RegExp(sourceData.validationRegex)
        const regexValid = regex.test(inputValue)
        
        // Both type and regex validation must pass
        const finalValid = typeValidation.isValid && regexValid
        setIsValid(finalValid)
        
        if (finalValid) {
          setValidationMessage(sourceData.validMessage || typeValidation.message)
        } else {
          // Show the more specific error message
          if (!typeValidation.isValid) {
            setValidationMessage(typeValidation.message)
          } else {
            setValidationMessage(sourceData.invalidMessage)
          }
        }
      } catch (error) {
        // Invalid regex pattern
        setIsValid(false)
        setValidationMessage('Invalid regex pattern')
      }
    } else {
      // Only use type-based validation
      setIsValid(typeValidation.isValid)
      setValidationMessage(typeValidation.message)
    }
  }, [inputValue, sourceData.validationRegex, sourceData.validMessage, sourceData.invalidMessage, sourceData.inputType])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
 
  }

  const handleBlur = () => {
    if (onWidgetCallback) {
      onWidgetCallback({ type: 'input:changed', value: inputValue })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onWidgetCallback) {
      onWidgetCallback({ type: 'input:submitted', value: inputValue })
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
        type={sourceData.inputType}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        placeholder={sourceData.placeholder}
        style={getInputStyles()}
        aria-label={sourceData.placeholder}
        aria-describedby={validationMessage ? 'validation-message' : undefined}
        min={sourceData.min !== undefined ? sourceData.min : undefined}
        max={sourceData.max !== undefined ? sourceData.max : undefined}
        step={sourceData.step !== undefined ? sourceData.step : undefined}
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
      </div>
    </div>
  )
}

// Export the instruction for this widget
export const InputWidgetInstruction = {
  type: 'input',
  instructions: 'Use this when the user needs to input some value. The widget automatically detects input type based on field name or placeholder, but you can also specify it explicitly. Supports text, email, number, date, time, datetime-local, url, tel, and password input types with built-in validation.',
  sourceDataModel: {
    placeholder: 'string (optional) - placeholder for the input field',
    inputType: 'string (optional) - one of: text, email, number, date, datetime-local, time, url, tel, password. If not specified, will be auto-detected from fieldName or placeholder',
    fieldName: 'string (optional) - name of the field (used for auto-detection of input type)',
    validationRegex: 'string (optional) - regex pattern for additional validation (combined with type validation)',
    validMessage: 'string (optional) - message shown when input is valid',
    invalidMessage: 'string (optional) - message shown when input is invalid',
    currentValue: 'string (optional) - initial value and current value for the input field (used for both initial state and history sync)',
    min: 'number (optional) - minimum value for number/date inputs',
    max: 'number (optional) - maximum value for number/date inputs',
    step: 'number (optional) - step value for number inputs'
  }
}

// Memoized component to prevent unnecessary re-renders
export const InputWidget = React.memo(InputWidgetComponent, (prevProps, nextProps) => {
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
