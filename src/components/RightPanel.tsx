import React from 'react'
import { type FC } from 'react'
import { renderWidget } from './widgets'

interface PinnedWidget {
  widgetContent: { type: string; source?: string; [key: string]: unknown }
  widgetType: string
  historyIndex: number
}

interface RightPanelProps {
  pinnedWidgets: PinnedWidget[]
  activeTab: number
  onTabChange: (tabIndex: number) => void
  onTabClose: (historyIndex: number) => void
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  lockUI?: boolean
  hideWidgetFooter?: boolean
}

export const RightPanel: FC<RightPanelProps> = ({
  pinnedWidgets,
  activeTab,
  onTabChange,
  onTabClose,
  onWidgetCallback,
  widgetsOptions,
  lockUI = false,
  hideWidgetFooter = false
}) => {
  if (pinnedWidgets.length === 0) {
    return null
  }

  const activeWidget = pinnedWidgets[activeTab] || pinnedWidgets[0]

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
      {/* Tab Header Bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9fafb'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '0 0px',
          gap: '4px'
        }}>
          {pinnedWidgets.map((pinnedWidget, index) => {
            const isActive = index === activeTab
            return (
              <div
                key={pinnedWidget.historyIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderBottom: isActive ? '2px solid #007bff' : '2px solid transparent',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.15s ease-in-out',
                  fontSize: '13px',
                  fontWeight: isActive ? '500' : '400',
                  color: isActive ? '#007bff' : '#6b7280',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
                onClick={() => onTabChange(index)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>
                  {pinnedWidget.widgetType.replace('_', ' ')}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!lockUI) {
                      onTabClose(pinnedWidget.historyIndex)
                    }
                  }}
                  disabled={lockUI}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? '#007bff' : '#9ca3af',
                    cursor: lockUI ? 'not-allowed' : 'pointer',
                    padding: '2px',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    transition: 'all 0.15s ease-in-out',
                    fontSize: '12px',
                    opacity: lockUI ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!lockUI) {
                      e.currentTarget.style.backgroundColor = isActive ? '#e0f2fe' : '#e5e7eb'
                      e.currentTarget.style.color = '#dc2626'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!lockUI) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = isActive ? '#007bff' : '#9ca3af'
                    }
                  }}
                  title={lockUI ? "Locked" : "Close tab"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Widget content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderWidget(activeWidget.widgetContent, onWidgetCallback, widgetsOptions, -1, lockUI, hideWidgetFooter)}
      </div>
    </div>
  )
}
