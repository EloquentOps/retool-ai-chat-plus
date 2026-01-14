import React from 'react'
import { type FC } from 'react'

interface RiskItem {
  opportunityId?: string
  accountName?: string
  value?: string
  riskLevel?: string
  reason?: string
  suggestedAction?: string
}

interface RiskCardsWidgetProps {
  // The source can be the full message object or a direct payload array
  source?: string | { message?: string; widgetType?: string; payload?: RiskItem[] } | RiskItem[]
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const cardBaseStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
  padding: '16px',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minWidth: 240
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px'
}

const riskBadge = (level?: string): React.CSSProperties => {
  const map: Record<string, string> = {
    High: '#ef4444',
    Medium: '#f59e0b',
    Low: '#10b981'
  }
  const color = level && map[level] ? map[level] : '#6b7280'
  return {
    background: color,
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600
  }
}

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '16px',
  width: '100%'
}

const RiskCardsWidgetComponent: FC<RiskCardsWidgetProps> = ({ source, onWidgetCallback, historyIndex }) => {
  let items: RiskItem[] = []

  if (!source) {
    return <div style={{ color: '#6b7280' }}>No data</div>
  }

  if (Array.isArray(source)) {
    items = source
  } else if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source)
      if (Array.isArray(parsed)) items = parsed
      else if (parsed && Array.isArray(parsed.payload)) items = parsed.payload
    } catch (e) {
      // ignore
    }
  } else if (typeof source === 'object' && source !== null) {
    const s = source as { payload?: RiskItem[] }
    if (Array.isArray(s.payload)) items = s.payload
  }

  const handleClick = (item: RiskItem) => {
    onWidgetCallback?.({ type: 'risk_card:clicked', opportunityId: item.opportunityId, item, messageIndex: historyIndex })
  }

  return (
    <div style={containerStyle}>
      {items.map((it, idx) => (
        <div
          key={it.opportunityId || idx}
          onClick={() => handleClick(it)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClick(it) }}
          style={cardBaseStyle}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.transform = 'translateY(-6px)'
            el.style.boxShadow = '0 12px 30px rgba(15,23,42,0.12)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.transform = 'none'
            el.style.boxShadow = '0 6px 18px rgba(15,23,42,0.08)'
          }}
        >
          <div style={headerStyle}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.accountName || '—'}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{it.value || ''}</div>
            </div>
            <div style={riskBadge(it.riskLevel)}>{it.riskLevel || 'Unknown'}</div>
          </div>

          <div style={{ color: '#374151', fontSize: 13 }}>{it.reason}</div>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: '#6b7280', fontSize: 13 }}>{it.opportunityId}</div>
            <div
              title={typeof it.suggestedAction === 'string' && it.suggestedAction.length > 0 ? it.suggestedAction : undefined}
              style={{
                color: '#0f172a',
                background: '#f8fafc',
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 13,
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {typeof it.suggestedAction === 'string' && it.suggestedAction.length > 0
                ? (it.suggestedAction.length > 60 ? it.suggestedAction.slice(0, 60) + '…' : it.suggestedAction)
                : 'No suggestion'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const RiskCardsWidget = React.memo(RiskCardsWidgetComponent, (prevProps, nextProps) => {
  const prev = prevProps.source
  const next = nextProps.source

  const normalize = (s: any): any[] => {
    if (!s) return []
    if (Array.isArray(s)) return s
    if (typeof s === 'string') {
      try { const p = JSON.parse(s); return Array.isArray(p) ? p : (p?.payload ?? []) } catch { return [] }
    }
    if (typeof s === 'object') return s.payload ?? []
    return []
  }

  const prevArr = normalize(prev)
  const nextArr = normalize(next)

  if (prevArr.length !== nextArr.length) return false

  for (let i = 0; i < prevArr.length; i++) {
    if (JSON.stringify(prevArr[i]) !== JSON.stringify(nextArr[i])) return false
  }

  return prevProps.historyIndex === nextProps.historyIndex
})

export const RiskCardsWidgetInstruction = {
  type: 'riskcards',
  instructions: 'Use to display a grid of risk/opportunity cards. Each card should show account name, value, risk level, brief reason, and a suggested action. Provide a compact summary and include opportunity id when available.',
  sourceDataModel: {
    message: 'string',
    widgetType: 'riskcards',
    payload: [
      {
        opportunityId: 'string',
        accountName: 'string',
        accountId: 'string',
        value: 'string',
        riskLevel: 'High|Medium|Low',
        reason: 'string',
        suggestedAction: 'string'
      }
    ]
  }
}

export default RiskCardsWidget
