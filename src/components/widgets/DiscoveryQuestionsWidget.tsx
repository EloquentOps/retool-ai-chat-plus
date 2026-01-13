import React, { useState } from 'react'
import { type FC } from 'react'
import { isPromoted } from '../../utils/widgetUtils'

interface DiscoveryQuestion {
  question: string
  why?: string
  id?: string | number
}

interface DiscoveryQuestionsWidgetProps {
  source: string | DiscoveryQuestion[] | object
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
  promotedWidgets?: Record<string, unknown>
}

const DiscoveryQuestionsWidgetComponent: FC<DiscoveryQuestionsWidgetProps> = ({ source, onWidgetCallback, historyIndex, promotedWidgets }) => {
  // Generate a UUID (uses crypto.randomUUID when available)
  const generateUUID = (): string => {
    try {
      // ts-expect-error: crypto may be available in the environment
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return (crypto as any).randomUUID()
      }
    } catch (e) {
      // ignore and fallback
    }

    // Fallback UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  const normalizeSource = (src: DiscoveryQuestionsWidgetProps['source']): DiscoveryQuestion[] => {
    if (Array.isArray(src)) return src as DiscoveryQuestion[]
    if (typeof src === 'string') {
      try {
        const parsed = JSON.parse(src)
        if (Array.isArray(parsed)) return parsed
        if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as any).questions)) {
          return (parsed as any).questions
        }
        return src.split('\n').filter(Boolean).map((q, i) => ({ question: q.trim() }))
      } catch (e) {
        return src.split('\n').filter(Boolean).map((q, i) => ({ question: q.trim() }))
      }
    }
    if (typeof src === 'object' && src !== null) {
      const s = src as any
      if (Array.isArray(s.questions)) return s.questions
      return [{ question: JSON.stringify(src) }]
    }
    return []
  }

  // Persist items with stable UUIDs across the component lifecycle
  const [items] = useState<DiscoveryQuestion[]>(() => {
    const normalized = normalizeSource(source)
    return normalized.map((q, idx) => ({ ...q, id: q.id ?? generateUUID() }))
  })



  const handleAdd = (q: DiscoveryQuestion, index: number) => {
    const item = {
      question: q.question,
      why: q.why,
      id: q.id ?? generateUUID(),
      addedAt: Date.now()
    }

    onWidgetCallback?.({
      type: 'widget:add',
      widgetType: 'discovery_questions',
      item,
      timestamp: item.addedAt,
      historyIndex
    })
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, Roboto, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((q, i) => {
          const id = q.id ?? i
          return (
            <div key={String(id)} style={{ padding: '12px', borderRadius: '6px', background: '#fff', boxShadow: '0 0 0 1px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', overflowWrap: 'anywhere' }}>{q.question}</div>
                    {q.why && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>{q.why}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {
                    (() => {
                      const id = q.id ?? i
                      const promoted = isPromoted(promotedWidgets, 'discovery_questions', id)
                      return (
                        <button
                          onClick={() => handleAdd(q, i)}
                          disabled={promoted}
                          style={{ background: '#0b74ff', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: promoted ? 'not-allowed' : 'pointer', opacity: promoted ? 0.6 : 1 }}
                          aria-label={`Add question ${i + 1}`}
                        >
                          {promoted ? 'Remove' : 'Add'}
                        </button>
                      )
                    })()
                  }
                </div>
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <div style={{ padding: '12px', color: '#6b7280' }}>No discovery questions provided.</div>
        )}
      </div>
    </div>
  )
}

export const DiscoveryQuestionsWidget = React.memo(DiscoveryQuestionsWidgetComponent, (prevProps, nextProps) => {
  // For arrays, do a shallow compare of length and JSON for items
  const a = prevProps.source
  const b = nextProps.source

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false
    }
    return prevProps.historyIndex === nextProps.historyIndex
  }

  return JSON.stringify(a) === JSON.stringify(b) && prevProps.historyIndex === nextProps.historyIndex
})

export const DiscoveryQuestionsWidgetInstruction = {
  type: 'discovery_questions',
  instructions: 'Use this widget to present a vertical list of targeted discovery questions for a sales rep preparing for a call. Each item should include a concise question and optional brief rationale explaining why the question is useful in the context of the lead. The UI should render a vertical stack of interactive items with an Add action for each question and a lightweight "Why this question?" detail that can be revealed.',
  sourceDataModel: {
    type: 'array',
    items: {
      question: 'string (the discovery question text)',
      why: 'string (optional, brief rationale explaining why this question is useful)',
      id: 'string|number (optional)'
    }
  }
}
