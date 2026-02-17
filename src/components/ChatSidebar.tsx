import React from 'react'
import { type FC } from 'react'

interface ChatSidebarProps {
  visible?: boolean
}

export const ChatSidebar: FC<ChatSidebarProps> = ({ visible = true }) => {
  if (!visible) {
    return null
  }

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px',
        height: '100%',
        borderRight: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        overflow: 'auto'
      }}
    >
      {/* Empty for now - content will be added later */}
    </div>
  )
}
