import React, { useState, useEffect } from 'react'
import { type FC } from 'react'

interface CheckListItem {
  label: string
  checked?: boolean
  value?: string
}

interface CheckListWidgetProps {
  source: CheckListItem[] | string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const CheckListWidgetComponent: FC<CheckListWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  historyIndex
}) => {
  // Parse source to handle both array and string formats
  const parseSource = (sourceData: CheckListItem[] | string): CheckListItem[] => {
    if (typeof sourceData === 'string') {
      try {
        const parsed = JSON.parse(sourceData)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        // If string is not JSON, treat each line as a checklist item
        return sourceData.split('\n').filter(line => line.trim()).map((line, index) => ({
          label: line.trim(),
          checked: false,
          value: `item-${index}`
        }))
      }
    }
    return Array.isArray(sourceData) ? sourceData : []
  }

  const initialItems = parseSource(source)
  const [items, setItems] = useState<CheckListItem[]>(initialItems)

  // Update items when source changes
  useEffect(() => {
    const newItems = parseSource(source)
    setItems(newItems)
  }, [source])

  const handleCheckboxChange = (index: number) => {
    const updatedItems = items.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    )
    setItems(updatedItems)

    // Trigger callback with updated state
    if (onWidgetCallback) {
      const changedItem = updatedItems[index]
      onWidgetCallback({
        type: 'checklist:changed',
        itemIndex: index,
        item: changedItem,
        //allItems: updatedItems,
        checkedItems: updatedItems.filter(item => item.checked),
        historyIndex
      })
    }
  }

  const getContainerStyles = () => {
    return {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      padding: '8px 0',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }

  const getItemStyles = (isChecked: boolean) => {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 12px',
      borderRadius: '6px',
      backgroundColor: isChecked ? '#f0f9ff' : '#ffffff',
      border: `1px solid ${isChecked ? '#3b82f6' : '#e5e7eb'}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      fontSize: '14px',
      color: '#374151',
      lineHeight: '1.5'
    }
  }

  const getCheckboxStyles = (isChecked: boolean) => {
    return {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#3b82f6',
      flexShrink: 0
    }
  }

  const getLabelStyles = (isChecked: boolean) => {
    return {
      flex: 1,
      textDecoration: isChecked ? 'line-through' : 'none',
      color: isChecked ? '#6b7280' : '#374151',
      userSelect: 'none' as const
    }
  }

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        No items in checklist
      </div>
    )
  }

  return (
    <div style={getContainerStyles()}>
      {items.map((item, index) => {
        const isChecked = item.checked || false
        const itemValue = item.value || `item-${index}`
        const itemLabel = item.label || `Item ${index + 1}`

        return (
          <div
            key={itemValue}
            style={getItemStyles(isChecked)}
            onClick={() => handleCheckboxChange(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCheckboxChange(index)
              }
            }}
            tabIndex={0}
            role="checkbox"
            aria-checked={isChecked}
            aria-label={itemLabel}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleCheckboxChange(index)}
              onClick={(e) => e.stopPropagation()}
              style={getCheckboxStyles(isChecked)}
              tabIndex={-1}
              aria-hidden="true"
            />
            <label
              style={getLabelStyles(isChecked)}
              onClick={(e) => e.preventDefault()}
            >
              {itemLabel}
            </label>
          </div>
        )
      })}
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const CheckListWidget = React.memo(CheckListWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  const prevSource = prevProps.source
  const nextSource = nextProps.source
  
  // Compare source data (array or string)
  if (typeof prevSource === 'string' && typeof nextSource === 'string') {
    return prevSource === nextSource && prevProps.historyIndex === nextProps.historyIndex
  }
  
  if (Array.isArray(prevSource) && Array.isArray(nextSource)) {
    if (prevSource.length !== nextSource.length) {
      return false // Array length changed, allow re-render
    }
    
    // Compare each item
    for (let i = 0; i < prevSource.length; i++) {
      const prevItem = prevSource[i]
      const nextItem = nextSource[i]
      
      if (prevItem.label !== nextItem.label || 
          prevItem.checked !== nextItem.checked ||
          prevItem.value !== nextItem.value) {
        return false // Item changed, allow re-render
      }
    }
    
    return prevProps.historyIndex === nextProps.historyIndex
  }
  
  // Different types, allow re-render
  return false
})

// Export the instruction for this widget
export const CheckListWidgetInstruction = {
  type: 'checklist',
  instructions: 'Use this widget when the user needs to interact with a list of items with checkboxes. Each item can be checked or unchecked independently.',
  sourceDataModel: [
    {
      label: 'string - The text label for the checklist item',
      checked: 'boolean (optional) - Whether the item is checked by default',
      value: 'string (optional) - Unique identifier for the item'
    }
  ]
}

