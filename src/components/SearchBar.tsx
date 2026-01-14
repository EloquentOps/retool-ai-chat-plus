import React, { useState, useEffect } from 'react'

interface SearchBarProps {
  onSearchQuery?: (q: string) => Promise<any[]> | any[]
  onSelectSearchResult?: (item: any) => void
  selectedItem?: any
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearchQuery, onSelectSearchResult, selectedItem }) => {
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  // debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!onSearchQuery || q.trim().length === 0) {
        setSuggestions([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = onSearchQuery(q)
        const arr = res instanceof Promise ? await res : res
        setSuggestions(arr || [])
        setShow(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, onSearchQuery])

  const handleSelect = (item: any) => {
    onSelectSearchResult?.(item)
    setQ('')
    setSuggestions([])
    setShow(false)
  }

  const handleClear = () => {
    console.log('handleClear called, clearing local SearchBar state immediately')
    setQ('')
    setSuggestions([])
    setShow(false)
    // Send null to parent - same pattern as handleSelect but with null
    console.log('Sending null to parent')
    onSelectSearchResult?.(null)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          aria-label="Search accounts and opportunities"
          placeholder="Search accounts or deals..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (suggestions.length) setShow(true) }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e6e6e6',
            fontSize: 14,
            background: '#fff'
          }}
        />
        {(q.length > 0 || (selectedItem && Object.keys(selectedItem).length > 0 && !(selectedItem as any)._cleared)) && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #e6e6e6',
              background: '#fff',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Clear
          </button>
        )}
      </div>

      {show && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 48,
          left: 0,
          width: '100%',
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          zIndex: 40,
          maxHeight: 320,
          overflow: 'auto'
        }}>
          {loading ? (
            <div style={{ padding: 12 }}>Searching…</div>
          ) : suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              style={{
                padding: 10,
                borderBottom: '1px solid #f5f5f5',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {(
                  (s._type
                    ? s._type.charAt(0).toUpperCase() + s._type.slice(1)
                    : s.type
                      ? String(s.type).charAt(0).toUpperCase() + String(s.type).slice(1)
                      : 'Object')
                  + (s.caption ? ` • ${s.caption}` : '')
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* show selected item brief */}
      {selectedItem && typeof selectedItem === 'object' && selectedItem.name && !selectedItem._cleared && Object.keys(selectedItem).length > 1 && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
          Selected: <strong>{selectedItem.name}</strong> <span style={{ color: '#666' }}>{selectedItem._type}</span>
        </div>
      )}
    </div>
  )
}

export default SearchBar
