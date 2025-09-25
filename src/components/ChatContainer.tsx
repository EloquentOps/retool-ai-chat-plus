import React from 'react'
import { type FC } from 'react'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'

interface ChatContainerProps {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string | { type: string; source: string; [key: string]: unknown }
  }>
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  onStop?: () => void
}

export const ChatContainer: FC<ChatContainerProps> = ({
  messages,
  onSubmitQuery,
  isLoading,
  onWidgetCallback,
  onStop
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100% - 3px)',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <MessageList messages={messages} isLoading={isLoading} onWidgetCallback={onWidgetCallback} />
      <InputBar onSubmitQuery={onSubmitQuery} isLoading={isLoading} onStop={onStop} />
    </div>
  )
}
