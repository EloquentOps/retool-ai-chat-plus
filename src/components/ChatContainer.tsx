import React from 'react'
import { type FC } from 'react'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'

interface ChatContainerProps {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string | { type: string; [key: string]: unknown }
  }>
  onSubmitQuery: (message: string) => void
  isLoading: boolean
}

export const ChatContainer: FC<ChatContainerProps> = ({
  messages,
  onSubmitQuery,
  isLoading
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100% - 3px)',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      overflow: 'hidden'
    }}>
      <MessageList messages={messages} isLoading={isLoading} />
      <InputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} />
    </div>
  )
}
