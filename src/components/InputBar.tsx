import React, { useState } from 'react'
import { type FC } from 'react'

interface InputBarProps {
  onSubmitQuery: (message: string) => void
  isLoading: boolean
}

export const InputBar: FC<InputBarProps> = ({ onSubmitQuery, isLoading }) => {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
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

  return (
    <div style={{
      borderTop: '1px solid #e0e0e0',
      padding: '16px',
      backgroundColor: '#fafafa'
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
            backgroundColor: '#ffffff'
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: (inputValue.trim() && !isLoading) ? '#007bff' : '#ccc',
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: (inputValue.trim() && !isLoading) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
