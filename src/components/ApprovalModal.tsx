import React from 'react'
import { type FC } from 'react'

interface ApprovalModalProps {
  isVisible: boolean
  onAllow: () => void
  onDeny: () => void
  title?: string
  message?: string
  toolInfo?: {
    toolName: string
    toolDescription: string
    toolParameters: Record<string, unknown>
    toolUseReasoning: string
    toolUseReasoningSummary: string
  }
}

export const ApprovalModal: FC<ApprovalModalProps> = ({
  isVisible,
  onAllow,
  onDeny,
  title = 'Approval Required',
  message = 'This action requires your approval before proceeding.',
  toolInfo
}) => {
  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}
    onClick={(e) => {
      // Prevent closing when clicking the backdrop
      e.preventDefault()
    }}
    >
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center'
      }}
      onClick={(e) => {
        // Prevent modal from closing when clicking inside
        e.stopPropagation()
      }}
      >
        

        {/* Title */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 12px 0',
          marginBottom: '12px'
        }}>
          {title}
        </h2>

        

        {/* Additional Tool Information */}
        {toolInfo && (
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 12px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Tool Details
            </h3>
            
            <div style={{ fontSize: '14px', color: '#374151' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Tool Name:</strong> {toolInfo.toolName}
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <strong>Description:</strong> {toolInfo.toolDescription}
              </div>

              {toolInfo.toolUseReasoningSummary && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Reasoning:</strong> {toolInfo.toolUseReasoningSummary}
                </div>
              )}

              {Object.keys(toolInfo.toolParameters).length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Parameters:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {Object.entries(toolInfo.toolParameters).map(([key, value]) => (
                      <li key={key}>
                        <strong>{key}:</strong> {String(value)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          {/* Allow button */}
          <button
            onClick={onAllow}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Allow
          </button>

          {/* Deny button */}
          <button
            onClick={onDeny}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  )
}
