import React from 'react'
import { type FC } from 'react'
import { renderWidget } from './widgets'

interface RightPanelProps {
  pinnedWidget: { type: string; source?: string; [key: string]: unknown }
  widgetType: string
  onClose: () => void
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

export const RightPanel: FC<RightPanelProps> = ({
  pinnedWidget,
  widgetType,
  onClose,
  onWidgetCallback,
  widgetsOptions
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '50%',
      height: '100%',
      borderLeft: '1px solid #e0e0e0',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header with close button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9fafb',
        minHeight: '48px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151'
        }}>
          <span>📌</span>
          <span style={{ textTransform: 'capitalize' }}>{widgetType.replace('_', ' ')}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease-in-out',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb'
            e.currentTarget.style.color = '#374151'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#6b7280'
          }}
          title="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      
      {/* Widget content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderWidget(pinnedWidget, onWidgetCallback, widgetsOptions, -1)}
      </div>
    </div>
  )
}

