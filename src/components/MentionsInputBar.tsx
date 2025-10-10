import React, { useState, useMemo } from 'react'
import { type FC } from 'react'
import { MentionsInput, Mention } from 'react-mentions'
import { WIDGET_REGISTRY } from './widgets/WidgetRegistry'
import { formatWidgetDisplayName } from '../utils/widgetUtils'

interface MentionsInputBarProps {
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  onStop?: () => void
  isCentered?: boolean
  widgetsOptions?: Record<string, unknown>
  placeholder?: string
}

interface WidgetData {
  id: string
  display: string
  description: string
}


export const MentionsInputBar: FC<MentionsInputBarProps> = ({ 
  onSubmitQuery, 
  isLoading, 
  onStop, 
  isCentered = false,
  widgetsOptions,
  placeholder = "Type your message... (use @ to insert widgets)"
}) => {
  const [inputValue, setInputValue] = useState('')

  // Convert widget registry to react-mentions format with useMemo
  const widgetData: WidgetData[] = useMemo(() => {
    // Check if widgetsOptions is empty or only contains text widget
    const isWidgetsOptionsEmpty = !widgetsOptions || Object.keys(widgetsOptions).length === 0
    const isOnlyTextWidget = widgetsOptions && Object.keys(widgetsOptions).length === 1 && widgetsOptions.text !== undefined
    
    // If no widgets configured or only text widget, return empty array to disable mentions menu
    if (isWidgetsOptionsEmpty || isOnlyTextWidget) {
      return []
    }
    
    // Determine which widgets should be available based on widgetsOptions
    const getAvailableWidgetTypes = (widgetsOptions: Record<string, unknown>): string[] => {
      // Get enabled widget types from widgetsOptions keys
      const enabledWidgetTypes = Object.keys(widgetsOptions)
      
      // Always include text widget regardless of widgetsOptions keys
      return [...new Set(['text', ...enabledWidgetTypes])]
    }

    const availableWidgetTypes = getAvailableWidgetTypes(widgetsOptions)
    
    return Object.entries(WIDGET_REGISTRY)
      .filter(([key, config]) => config.enabled && availableWidgetTypes.includes(key))
      .map(([key, config]) => ({
        id: key,
        display: formatWidgetDisplayName(key),
        description: config.instruction.instructions
      }))
  }, [widgetsOptions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, isLoading:', isLoading)
    if (inputValue.trim() && !isLoading) {
      console.log('Submitting query:', inputValue.trim())
      onSubmitQuery(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Stop button clicked')
    if (onStop) {
      console.log('Calling onStop function')
      onStop()
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, newValue: string, _newPlainTextValue: string, _mentions: unknown[]) => {
    setInputValue(newValue)
  }

  const containerStyle = isCentered ? {
    padding: '0',
    backgroundColor: 'transparent',
    borderTop: 'none'
  } : {
    borderTop: '1px solid #e0e0e0',
    padding: '16px',
    backgroundColor: '#fafafa'
  }

  return (
    <div style={{
      ...containerStyle,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        gap: '8px',
        position: 'relative'
      }}>
        {/* Mentions Input */}
        <div style={{ flex: 1, position: 'relative' }}>
            <MentionsInput
              value={inputValue}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              singleLine={true}
              forceSuggestionsAboveCursor={!isCentered}
            style={{
              control: {
                backgroundColor: '#ffffff',
                fontSize: '14px',
                fontWeight: 'normal',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                width: '100%',
                border: '1px solid #ddd',
                borderRadius: '24px',
                outline: 'none',
                minHeight: 'auto',
                lineHeight: '1.4'
              },
              '&multiLine': {
                control: {
                  minHeight: 'auto'
                }
              },
              highlighter: {
                padding: '12px 16px',
                border: 'none',
                borderRadius: '24px',
                fontSize: '14px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: '1.4',
                overflow: 'hidden',
                backgroundColor: 'transparent'
              },
              input: {
                padding: '12px 16px',
                border: 'none',
                borderRadius: '24px',
                fontSize: '14px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                backgroundColor: 'transparent',
                lineHeight: '1.4',
                minHeight: 'auto',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              },
              suggestions: {
                list: {
                  backgroundColor: '#ffffff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontSize: '14px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000
                },
                item: {
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  '&focused': {
                    backgroundColor: '#f0f8ff'
                  }
                }
              },
              mention: {
                backgroundColor: 'rgba(49, 112, 249, 0.1)',
                color: '#3170F9',
                fontWeight: '600',
                padding: '1px 2px',
                borderRadius: '3px'
              }
            }}
          >
            <Mention
              trigger="@"
              data={widgetData}
              displayTransform={(id: string, display: string) => `@${display}`}
              markup="@[__display__](__id__)"
              appendSpaceOnAdd={true}
              renderSuggestion={(entry: WidgetData, _search: string, _highlightedDisplay: string, _index: number, _focused: boolean) => (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px 0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      color: '#3170F9',
                      fontSize: '14px'
                    }}>
                      @{entry.display}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#666',
                      backgroundColor: '#f5f5f5',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {entry.id}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#888',
                    lineHeight: '1.4'
                  }}>
                    {entry.description.length > 80 
                      ? entry.description.substring(0, 80) + '...' 
                      : entry.description
                    }
                  </div>
                </div>
              )}
            />
          </MentionsInput>
        </div>

        {/* Send button */}
        <button
          type={isLoading ? 'button' : 'submit'}
          onClick={isLoading ? handleStop : undefined}
          disabled={!isLoading && !inputValue.trim()}
          style={{
            padding: '12px',
            backgroundColor: isLoading ? '#dc3545' : (inputValue.trim() && !isLoading) ? '#3170F9' : '#ccc',
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading || (inputValue.trim() && !isLoading) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '48px',
            height: '48px'
          }}
        >
          {isLoading ? (
            // Stop icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            // Send icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
