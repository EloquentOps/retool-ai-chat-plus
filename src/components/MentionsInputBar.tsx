import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { type FC } from 'react'
import { WIDGET_REGISTRY } from './widgets/WidgetRegistry'
import { formatWidgetDisplayName } from '../utils/widgetUtils'

interface MentionsInputBarProps {
  onSubmitQuery: (message: string) => void
  isLoading: boolean
  onStop?: () => void
  isCentered?: boolean
  widgetsOptions?: Record<string, unknown>
  tools?: Record<string, { tool: string; description: string }>
  sourcesOptions?: Record<string, { label: string; color?: string; items: Array<{ id?: string; label: string; content?: string }> }>
  commandOptions?: Record<string, { label: string; color?: string; items: Array<{ id: string; label: string }> }>
  atOptions?: Record<string, { label: string; color?: string; items: Array<{ id: string; display: string; hint?: string; description?: string }> }>
  placeholder?: string
  lockUI?: boolean
  fillInput?: string
  onFillApplied?: () => void
}

interface WidgetData {
  id: string
  display: string
  hint?: string
  description?: string
}

interface SourceData {
  id: string
  display: string
  content?: string
}

interface CommandData {
  id: string
  display: string
}

interface NormalizedGroup<T> {
  key: string
  label: string
  color?: string
  items: T[]
}

interface NormalizedSuggestions<T> {
  mode: 'array' | 'grouped'
  groups: NormalizedGroup<T>[]
}

interface MentionSegment {
  type: 'text' | 'mention'
  content: string
  trigger?: '@' | '#' | '/'
  display?: string
  id?: string
}

interface DropdownPosition {
  top: number
  left: number
  above: boolean
}

// Helper function to normalize object data
function normalizeSuggestions<T>(
  objectData: Record<string, { label: string; color?: string; items: T[] }> | undefined
): NormalizedSuggestions<T> {
  if (!objectData || Object.keys(objectData).length === 0) {
    return { mode: 'array', groups: [] }
  }
  
  const keys = Object.keys(objectData)
  const groups: NormalizedGroup<T>[] = Object.entries(objectData).map(([key, group]) => ({
    key,
    label: group.label || '',
    color: group.color,
    items: group.items || []
  }))
  
  // If single key with no label → simple mode (no tabs)
  if (keys.length === 1 && (!groups[0].label || groups[0].label.trim() === '')) {
    return { mode: 'array', groups }
  }
  
  // Multiple keys OR single key with label → grouped mode (with tabs)
  return { mode: 'grouped', groups }
}

// Utility function to generate slugified IDs from labels
function generateSlugId(label: string, existingIds: Set<string> = new Set()): string {
  let slug = label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  
  let finalSlug = slug
  let counter = 1
  while (existingIds.has(finalSlug)) {
    finalSlug = `${slug}_${counter}`
    counter++
  }
  
  return finalSlug || 'source'
}

// Parse text into segments (text and mentions)
function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  const mentionRegex = /(@|#|\/)\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match
  
  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }
    
    // Add mention
    const trigger = match[1] as '@' | '#' | '/'
    segments.push({
      type: 'mention',
      content: match[0],
      trigger,
      display: match[2],
      id: match[3]
    })
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }
  
  return segments.length > 0 ? segments : [{ type: 'text', content: text }]
}

// Detect active trigger from cursor position
function detectActiveTrigger(text: string, cursorPos: number): { trigger: '@' | '#' | '/' | null; query: string; startPos: number } {
  let i = cursorPos - 1
  while (i >= 0) {
    const char = text[i]
    if (char === '@' || char === '#' || char === '/') {
      // Check if this trigger is still active (no whitespace between trigger and cursor)
      let j = i + 1
      let hasOnlyTriggerChars = true
      while (j < cursorPos) {
        if (text[j] === ' ' || text[j] === '\n') {
          hasOnlyTriggerChars = false
          break
        }
        j++
      }
      if (hasOnlyTriggerChars) {
        const query = text.substring(i + 1, cursorPos)
        return {
          trigger: char as '@' | '#' | '/',
          query,
          startPos: i
        }
      }
    }
    if (char === ' ' || char === '\n') {
      return { trigger: null, query: '', startPos: -1 }
    }
    i--
  }
  return { trigger: null, query: '', startPos: -1 }
}

// Calculate cursor position in pixels
function getCursorPosition(textarea: HTMLTextAreaElement, position: number): { x: number; y: number; height: number } {
  const rect = textarea.getBoundingClientRect()
  const styles = window.getComputedStyle(textarea)
  
  // Create a mirror div to measure text
  const mirror = document.createElement('div')
  
  // Copy relevant styles
  const computedStyle = window.getComputedStyle(textarea)
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.font = computedStyle.font
  mirror.style.fontSize = computedStyle.fontSize
  mirror.style.fontFamily = computedStyle.fontFamily
  mirror.style.fontWeight = computedStyle.fontWeight
  mirror.style.lineHeight = computedStyle.lineHeight
  mirror.style.padding = computedStyle.padding
  mirror.style.border = computedStyle.border
  mirror.style.width = `${rect.width}px`
  mirror.style.boxSizing = computedStyle.boxSizing
  
  document.body.appendChild(mirror)
  
  // Get text before cursor
  const textBeforeCursor = textarea.value.substring(0, position)
  const textLines = textBeforeCursor.split('\n')
  const lastLine = textLines[textLines.length - 1] || ''
  
  // Set mirror content to match textarea content up to cursor
  mirror.textContent = textBeforeCursor
  
  // Measure the width of the last line
  const tempSpan = document.createElement('span')
  tempSpan.textContent = lastLine
  mirror.appendChild(tempSpan)
  
  const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
  
  // Get the width of text before cursor on the current line
  const textWidth = tempSpan.offsetWidth
  
  const x = rect.left + paddingLeft + textWidth
  const y = rect.top + paddingTop + (textLines.length - 1) * lineHeight
  
  document.body.removeChild(mirror)
  
  return { x, y, height: lineHeight }
}

export const MentionsInputBar: FC<MentionsInputBarProps> = ({ 
  onSubmitQuery, 
  isLoading, 
  onStop, 
  isCentered = false,
  widgetsOptions,
  tools,
  sourcesOptions,
  commandOptions,
  atOptions,
  placeholder = "Type your message... (use @ for widgets, # for sources, / for commands)",
  lockUI = false,
  fillInput,
  onFillApplied
}) => {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [activeTrigger, setActiveTrigger] = useState<'@' | '#' | '/' | null>(null)
  const [activeTabByTrigger, setActiveTabByTrigger] = useState<{ '@'?: string; '#'?: string; '/'?: string }>({})
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, above: false })
  const [searchQuery, setSearchQuery] = useState('')

  // Convert widget registry and tools to mention data
  const widgetDataArray: WidgetData[] = useMemo(() => {
    const mentionData: WidgetData[] = []
    
    const isWidgetsOptionsEmpty = !widgetsOptions || Object.keys(widgetsOptions).length === 0
    const isOnlyTextWidget = widgetsOptions && Object.keys(widgetsOptions).length === 1 && widgetsOptions.text !== undefined
    
    if (!isWidgetsOptionsEmpty && !isOnlyTextWidget) {
      const getAvailableWidgetTypes = (widgetsOptions: Record<string, unknown>): string[] => {
        return Object.keys(widgetsOptions)
      }

      const availableWidgetTypes = getAvailableWidgetTypes(widgetsOptions)
      
      const widgetMentions = Object.entries(WIDGET_REGISTRY)
        .filter(([key, config]) => 
          config.enabled && 
          availableWidgetTypes.includes(key) &&
          key !== 'text'
        )
        .map(([key, config]) => ({
          id: key,
          display: formatWidgetDisplayName(key),
          hint: config.instruction.hint,
          description: config.instruction.instructions || ''
        }))
      
      mentionData.push(...widgetMentions)
    }
    
    if (tools && Object.keys(tools).length > 0) {
      const toolMentions = Object.entries(tools).map(([key, toolConfig]) => ({
        id: key,
        display: 'Tool: ' + key.charAt(0).toUpperCase() + key.slice(1),
        description: toolConfig.description || ''
      }))
      
      mentionData.push(...toolMentions)
    }
    
    return mentionData
  }, [widgetsOptions, tools])

  // Normalize @ suggestions
  const atSuggestions = useMemo(() => {
    if (atOptions && Object.keys(atOptions).length > 0) {
      return normalizeSuggestions(atOptions)
    }
    
    if (widgetDataArray.length > 0) {
      return {
        mode: 'array',
        groups: [{ key: 'default', label: '', items: widgetDataArray }]
      }
    }
    
    return { mode: 'array', groups: [] }
  }, [widgetDataArray, atOptions])

  // Normalize # suggestions
  const sourcesOptionsKey = useMemo(() => {
    if (!sourcesOptions || Object.keys(sourcesOptions).length === 0) {
      return ''
    }
    return JSON.stringify(
      Object.entries(sourcesOptions).map(([key, group]) => [
        key,
        {
          label: group.label || '',
          color: group.color || '',
          items: (group.items || []).map(item => ({
            id: item.id !== undefined ? String(item.id) : undefined,
            label: item.label || '',
            content: item.content || ''
          }))
        }
      ]).sort(([a], [b]) => String(a).localeCompare(String(b)))
    )
  }, [sourcesOptions])
  
  const sourceSuggestions = useMemo(() => {
    if (!sourcesOptions || Object.keys(sourcesOptions).length === 0) {
      return { mode: 'array', groups: [] }
    }
    
    const normalizedGroups = Object.fromEntries(
      Object.entries(sourcesOptions).map(([key, group]) => {
        const existingIds = new Set<string>()
        const items = (group.items || [])
          .filter(source => source.id !== undefined || source.content)
          .map(source => {
            let id: string
            if (source.id !== undefined) {
              id = String(source.id)
            } else {
              id = generateSlugId(source.label, existingIds)
            }
            existingIds.add(id)
            return {
              id,
              display: source.label,
              content: source.content
            }
          })
        return [key, { ...group, items }]
      })
    )
    
    return normalizeSuggestions(normalizedGroups)
  }, [sourcesOptionsKey])

  // Normalize / suggestions
  const commandSuggestions = useMemo(() => {
    if (!commandOptions || Object.keys(commandOptions).length === 0) {
      return { mode: 'array', groups: [] }
    }
    
    const normalizedGroups = Object.fromEntries(
      Object.entries(commandOptions).map(([key, group]) => [
        key,
        {
          ...group,
          items: (group.items || []).map(cmd => ({
            id: cmd.id,
            display: cmd.label
          }))
        }
      ])
    )
    
    return normalizeSuggestions(normalizedGroups)
  }, [commandOptions])

  // Get active group items
  const getActiveGroupItems = <T extends { id: string }>(
    suggestions: NormalizedSuggestions<T>,
    trigger: '@' | '#' | '/',
    encodeIds: boolean = false
  ): T[] => {
    if (suggestions.mode === 'array' || suggestions.groups.length === 0) {
      return suggestions.groups[0]?.items || []
    }
    
    const activeTabKey = activeTabByTrigger[trigger] || suggestions.groups[0]?.key
    const activeGroup = suggestions.groups.find(g => g.key === activeTabKey) || suggestions.groups[0]
    
    if (!activeGroup) {
      return []
    }
    
    if (encodeIds && suggestions.mode === 'grouped') {
      return activeGroup.items.map(item => ({
        ...item,
        id: `${activeGroup.key}|${item.id}`
      })) as T[]
    }
    
    return activeGroup.items
  }

  // Get active group info
  const getActiveGroupInfo = useCallback((suggestions: NormalizedSuggestions<any>, trigger: '@' | '#' | '/'): NormalizedGroup<any> | null => {
    if (suggestions.mode === 'array' || suggestions.groups.length === 0) {
      return null
    }
    
    const activeTabKey = activeTabByTrigger[trigger] || suggestions.groups[0]?.key
    return suggestions.groups.find(g => g.key === activeTabKey) || suggestions.groups[0] || null
  }, [activeTabByTrigger])

  // Get active group color
  const activeGroupColor = useMemo(() => {
    const atGroup = getActiveGroupInfo(atSuggestions as NormalizedSuggestions<any>, '@')
    const sourceGroup = getActiveGroupInfo(sourceSuggestions as NormalizedSuggestions<any>, '#')
    const commandGroup = getActiveGroupInfo(commandSuggestions as NormalizedSuggestions<any>, '/')
    return {
      '@': atGroup?.color || '#3170F9',
      '#': sourceGroup?.color || '#8B5CF6',
      '/': commandGroup?.color || '#10B981'
    }
  }, [atSuggestions, sourceSuggestions, commandSuggestions, getActiveGroupInfo])

  // Get filtered suggestions based on active trigger and search query
  const getFilteredSuggestions = useCallback(() => {
    if (!activeTrigger) return []
    
    let items: Array<WidgetData | SourceData | CommandData> = []
    
    if (activeTrigger === '@') {
      items = getActiveGroupItems(atSuggestions as NormalizedSuggestions<WidgetData>, '@', false)
    } else if (activeTrigger === '#') {
      const sourceItems = getActiveGroupItems(sourceSuggestions as NormalizedSuggestions<SourceData>, '#', false)
      items = sourceItems.map(item => ({
        id: item.id,
        display: item.display,
        content: (item as SourceData).content
      }))
    } else if (activeTrigger === '/') {
      items = getActiveGroupItems(commandSuggestions as NormalizedSuggestions<CommandData>, '/', false)
    }
    
    // Filter by search query
    if (searchQuery) {
      items = items.filter(item => 
        item.display.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return items
  }, [activeTrigger, searchQuery, atSuggestions, sourceSuggestions, commandSuggestions, activeTabByTrigger])

  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef.current || !activeTrigger) {
      return
    }
    
    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart || 0
    
    try {
      const position = getCursorPosition(textarea, cursorPos)
      const rect = textarea.getBoundingClientRect()
      const dropdownHeight = 250 // Approximate dropdown height
      const dropdownWidth = 300 // Approximate dropdown width
      const spaceBelow = window.innerHeight - position.y
      const spaceAbove = position.y - rect.top
      
      const above = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
      
      // Ensure dropdown doesn't go off-screen horizontally
      let left = position.x
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 10
      }
      if (left < 10) {
        left = 10
      }
      
      setDropdownPosition({
        top: above ? position.y - dropdownHeight - 4 : position.y + position.height + 4,
        left,
        above
      })
    } catch (error) {
      // Fallback to positioning below textarea
      const rect = textarea.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        above: false
      })
    }
  }, [activeTrigger])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement> | React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    const newValue = target.value
    setInputValue(newValue)
    
    const cursorPos = target.selectionStart || 0
    const { trigger, query, startPos } = detectActiveTrigger(newValue, cursorPos)
    
    if (trigger && startPos >= 0) {
      setActiveTrigger(trigger)
      setSearchQuery(query)
      setShowSuggestions(true)
      setSelectedIndex(0)
      
      // Update position after a short delay to ensure DOM is updated
      setTimeout(() => {
        updateDropdownPosition()
      }, 0)
    } else {
      setActiveTrigger(null)
      setShowSuggestions(false)
      setSearchQuery('')
    }
  }, [updateDropdownPosition])

  // Sync scroll between textarea and overlay
  useEffect(() => {
    const textarea = textareaRef.current
    const overlay = overlayRef.current
    
    if (!textarea || !overlay) return
    
    const handleScroll = () => {
      overlay.scrollTop = textarea.scrollTop
      overlay.scrollLeft = textarea.scrollLeft
    }
    
    textarea.addEventListener('scroll', handleScroll)
    return () => textarea.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showSuggestions &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
        setActiveTrigger(null)
      }
    }
    
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  // Insert mention into textarea
  const insertMention = useCallback((item: WidgetData | SourceData | CommandData) => {
    if (!textareaRef.current || !activeTrigger) return
    
    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart || 0
    const { startPos } = detectActiveTrigger(inputValue, cursorPos)
    
    if (startPos < 0) return
    
    // Build mention markup
    const mentionMarkup = `${activeTrigger}[${item.display}](${item.id}) `
    
    // Insert mention
    const before = inputValue.substring(0, startPos)
    const after = inputValue.substring(cursorPos)
    const newValue = before + mentionMarkup + after
    
    setInputValue(newValue)
    setShowSuggestions(false)
    setActiveTrigger(null)
    setSearchQuery('')
    setSelectedIndex(0)
    
    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = startPos + mentionMarkup.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
      // Trigger input change to update overlay
      const event = new Event('input', { bubbles: true })
      textarea.dispatchEvent(event)
    }, 0)
  }, [inputValue, activeTrigger])

  // Handle submit
  const handleSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading && !lockUI) {
      onSubmitQuery(inputValue.trim())
      setInputValue('')
      setShowSuggestions(false)
      setActiveTrigger(null)
    }
  }, [inputValue, isLoading, lockUI, onSubmitQuery])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || !activeTrigger) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
      return
    }
    
    const filteredSuggestions = getFilteredSuggestions()
    
    if (filteredSuggestions.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        setActiveTrigger(null)
      }
      return
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredSuggestions[selectedIndex]) {
          insertMention(filteredSuggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setActiveTrigger(null)
        break
      case 'Tab':
        // Don't prevent default for tab - let it work normally when not in suggestions
        break
    }
  }, [showSuggestions, activeTrigger, selectedIndex, getFilteredSuggestions, insertMention, handleSubmit])

  // Handle stop
  const handleStop = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onStop) {
      onStop()
    }
  }, [onStop])

  // Apply fillInput
  useEffect(() => {
    if (fillInput != null && fillInput !== '') {
      setInputValue(fillInput)
      onFillApplied?.()
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }, [fillInput, onFillApplied])

  // Render mention segments for overlay
  const renderMentions = useCallback(() => {
    if (!inputValue) return null
    
    const segments = parseMentions(inputValue)
    
    return segments.map((segment, index) => {
      if (segment.type === 'mention' && segment.trigger) {
        const color = activeGroupColor[segment.trigger]
        const bgColor = segment.trigger === '@' 
          ? 'rgba(49, 112, 249, 0.1)'
          : segment.trigger === '#'
          ? 'rgba(139, 92, 246, 0.1)'
          : 'rgba(16, 185, 129, 0.1)'
        
        return (
          <span
            key={index}
            style={{
              backgroundColor: bgColor,
              color: color,
              fontWeight: '600',
              padding: '2px 8px',
              marginLeft: '4px',
              marginRight: '4px',
              borderRadius: '9999px',
              border: `1px solid ${color}40`,
              display: 'inline',
              lineHeight: '1.4',
              verticalAlign: 'baseline'
            }}
          >
            {segment.trigger}{segment.display}
          </span>
        )
      }
      // Render text with visible color
      return (
        <span 
          key={index}
          style={{
            color: '#333333',
            display: 'inline',
            whiteSpace: 'pre-wrap'
          }}
        >
          {segment.content}
        </span>
      )
    })
  }, [inputValue, activeGroupColor])

  // Get current suggestions
  const filteredSuggestions = getFilteredSuggestions()
  const currentSuggestions = activeTrigger === '@' 
    ? atSuggestions
    : activeTrigger === '#'
    ? sourceSuggestions
    : commandSuggestions

  const containerStyle = isCentered ? {
    padding: '0',
    backgroundColor: 'transparent',
    borderTop: 'none'
  } : {
    borderTop: '1px solid #e0e0e0',
    padding: '16px',
    backgroundColor: '#fafafa'
  }

  return (
    <div style={{
      ...containerStyle,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        gap: '8px',
        position: 'relative'
      }}>
        {/* Input wrapper with overlay */}
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          opacity: lockUI ? 0.6 : 1, 
          pointerEvents: lockUI ? 'none' : 'auto' 
        }}>
          {/* Overlay for styled mentions */}
          <div
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: '24px',
              backgroundColor: '#ffffff',
              fontSize: '14px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.4',
              overflow: 'hidden',
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              userSelect: 'none',
              zIndex: 0,
              boxSizing: 'border-box'
            }}
          >
            {renderMentions()}
            {!inputValue && (
              <span style={{ color: '#999', opacity: 0.5, pointerEvents: 'none' }}>
                {placeholder}
              </span>
            )}
          </div>
          
          {/* Actual textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={handleInputChange}
            placeholder=""
            disabled={lockUI}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '24px',
              fontSize: '14px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.4',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              minHeight: '48px',
              color: 'transparent',
              caretColor: '#3170F9',
              overflow: 'auto',
              position: 'relative',
              zIndex: 1,
              boxSizing: 'border-box',
              margin: 0
            }}
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontSize: '14px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              minWidth: '250px',
              maxWidth: '400px'
            }}
          >
            {/* Tab bar (if grouped) */}
            {currentSuggestions.mode === 'grouped' && currentSuggestions.groups.length >= 2 && (
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#fafafa',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                overflowX: 'auto'
              }}>
                {currentSuggestions.groups.map((group) => {
                  const normalizedGroup = group as NormalizedGroup<any>
                  const isActive = normalizedGroup.key === (activeTabByTrigger[activeTrigger!] || currentSuggestions.groups[0]?.key)
                  return (
                    <button
                      key={normalizedGroup.key}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setActiveTabByTrigger(prev => ({ ...prev, [activeTrigger!]: normalizedGroup.key }))
                        setSelectedIndex(0)
                      }}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        backgroundColor: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? (normalizedGroup.color || activeGroupColor[activeTrigger!]) : '#666',
                        fontWeight: isActive ? '600' : '400',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderBottom: isActive ? `2px solid ${normalizedGroup.color || activeGroupColor[activeTrigger!]}` : '2px solid transparent',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#f0f0f0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {normalizedGroup.label}
                    </button>
                  )
                })}
              </div>
            )}
            
            {/* Suggestions list */}
            <div>
              {filteredSuggestions.map((item, index) => {
                const isSelected = index === selectedIndex
                const isWidget = activeTrigger === '@'
                const isSource = activeTrigger === '#'
                const isCommand = activeTrigger === '/'
                
                return (
                  <div
                    key={item.id}
                    onClick={() => insertMention(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: isSelected ? '#f0f8ff' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {isWidget && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontWeight: '600',
                            color: activeGroupColor['@'],
                            fontSize: '14px'
                          }}>
                            @{(item as WidgetData).display}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#666',
                            backgroundColor: '#f5f5f5',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {item.id}
                          </span>
                        </div>
                        {(item as WidgetData).hint && (
                          <div style={{
                            fontSize: '12px',
                            color: '#888',
                            lineHeight: '1.4'
                          }}>
                            {(item as WidgetData).hint}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isSource && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontWeight: '600',
                            color: activeGroupColor['#'],
                            fontSize: '14px'
                          }}>
                            #{(item as SourceData).display}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#666',
                            backgroundColor: '#f5f5f5',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {item.id}
                          </span>
                        </div>
                        {(item as SourceData).content && (
                          <div style={{
                            fontSize: '12px',
                            color: '#888',
                            lineHeight: '1.4',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {(item as SourceData).content}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isCommand && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontWeight: '600',
                          color: activeGroupColor['/'],
                          fontSize: '14px'
                        }}>
                          /{(item as CommandData).display}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#666',
                          backgroundColor: '#f5f5f5',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {item.id}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          type={isLoading ? 'button' : 'submit'}
          onClick={isLoading ? handleStop : undefined}
          disabled={lockUI || (!isLoading && !inputValue.trim())}
          style={{
            padding: '12px',
            backgroundColor: lockUI ? '#ccc' : (isLoading ? '#dc3545' : (inputValue.trim() && !isLoading) ? '#3170F9' : '#ccc'),
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: lockUI ? 'not-allowed' : (isLoading || (inputValue.trim() && !isLoading) ? 'pointer' : 'not-allowed'),
            transition: 'background-color 0.2s',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '48px',
            height: '48px',
            opacity: lockUI ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
