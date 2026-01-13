import React from 'react'
import { type FC } from 'react'
import { isPromoted } from '../../utils/widgetUtils'

interface BattlecardItem {
  competitorName?: string
  strengths?: string[] | string
  landmine?: string
}

interface BattlecardWidgetProps {
  source?: string | { message?: string; widgetType?: string; payload?: BattlecardItem[] } | BattlecardItem[]
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
  promotedWidgets?: Record<string, unknown>
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

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '16px',
  width: '100%'
}

const strengthsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: 13,
  color: '#374151'
}

const BattlecardWidgetComponent: FC<BattlecardWidgetProps> = ({ source, onWidgetCallback, historyIndex, promotedWidgets }) => {
  let items: BattlecardItem[] = []

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
    const s = source as { payload?: BattlecardItem[] }
    if (Array.isArray(s.payload)) items = s.payload
  }

  const handlePin = (item: BattlecardItem) => {
    const payloadItem = {
      competitorName: item.competitorName,
      strengths: item.strengths,
      landmine: item.landmine,
      id: item.competitorName ?? `${Date.now()}`,
      addedAt: Date.now()
    }

    onWidgetCallback?.({
      type: 'widget:add',
      widgetType: 'battlecard',
      item: payloadItem,
      timestamp: payloadItem.addedAt,
      historyIndex
    })
  }

  return (
    <div style={containerStyle}>
      {items.map((it, idx) => {
        const id = it.competitorName ?? `${idx}`
        const promoted = isPromoted(promotedWidgets, 'battlecard', id)
        return (
        <div
          key={it.competitorName || idx}
          role="group"
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
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.competitorName || '—'}</div>
            </div>
            <button
              onClick={() => handlePin(it)}
              disabled={promoted}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                padding: '8px 10px',
                borderRadius: 8,
                cursor: promoted ? 'not-allowed' : 'pointer',
                opacity: promoted ? 0.6 : 1
              }}
              title={promoted ? 'Promoted (managed in Retool)' : 'Pin landmine'}
            >
              {promoted ? 'Unpin' : 'Pin'}
            </button>
          </div>

          <div style={strengthsStyle}>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Strengths</div>
            {Array.isArray(it.strengths)
              ? it.strengths.map((s, i) => (
                <div key={i} style={{ color: '#4b5563', fontSize: 13 }}>• {s}</div>
              ))
              : (it.strengths ? <div style={{ color: '#4b5563' }}>{it.strengths}</div> : <div style={{ color: '#6b7280' }}>No strengths provided</div>)
            }
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: '#6b7280', fontSize: 13 }}>Landmine</div>
            <div style={{ color: '#0f172a', fontSize: 14 }}>{it.landmine || 'No landmine provided'}</div>
          </div>
        </div>
      )})}
    </div>
  )
}

export const BattlecardWidget = React.memo(BattlecardWidgetComponent, (prevProps, nextProps) => {
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

export const BattlecardWidgetInstruction = {
  type: 'battlecard',
  instructions: 'Use to display a grid of competitor battlecards. Each card should present competitor name, a short list of strengths, and a single actionable "landmine" (a counter-point or question).',
  sourceDataModel: {
    message: 'string',
    widgetType: 'battlecard',
    payload: [
      {
        competitorName: 'string',
        strengths: ['string'],
        landmine: 'string'
      }
    ]
  }
}

export default BattlecardWidget
