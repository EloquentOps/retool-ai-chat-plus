import React from 'react'
import { type FC } from 'react'

interface ChatHeaderProps {
  onToggleSidebar?: () => void
  sidebarVisible?: boolean
}

export const ChatHeader: FC<ChatHeaderProps> = ({ onToggleSidebar, sidebarVisible }) => {
  return (
    <div
      style={{
        height: '60px',
        minHeight: '60px',
        maxHeight: '60px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#ffffff'
      }}
    >
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            marginRight: '12px'
          }}
          aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}
      {/* Empty for now - content will be added later */}
    </div>
  )
}
