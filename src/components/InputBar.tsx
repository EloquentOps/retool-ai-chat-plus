import React, { useState } from 'react'
import { type FC } from 'react'

interface InputBarProps {
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  onStop?: () => void
}

export const InputBar: FC<InputBarProps> = ({ onSubmitQuery, isLoading, onStop }) => {
  const [inputValue, setInputValue] = useState('')

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

  return (
    <div style={{
      borderTop: '1px solid #e0e0e0',
      padding: '16px',
      backgroundColor: '#fafafa',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #ddd',
            borderRadius: '24px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: '#ffffff',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        />
        <button
          type={isLoading ? 'button' : 'submit'}
          onClick={isLoading ? handleStop : undefined}
          disabled={!isLoading && !inputValue.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading ? '#dc3545' : (inputValue.trim() && !isLoading) ? '#3170F9' : '#ccc',
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading || (inputValue.trim() && !isLoading) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          {isLoading ? 'Stop' : 'Send'}
        </button>
      </form>
    </div>
  )
}
