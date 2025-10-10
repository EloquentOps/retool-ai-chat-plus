import React, { useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import { TabulatorFull as Tabulator } from 'tabulator-tables'

interface TabulatorWidgetProps {
  source: Array<Record<string, unknown>>
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

// Helper type for Tabulator row
interface TabulatorRow {
  getData: () => Record<string, unknown>
  getPosition: () => number
}

export const TabulatorWidget: FC<TabulatorWidgetProps> = ({ 
  source, 
  onWidgetCallback, 
  widgetsOptions,
  historyIndex 
}) => {
  const tableRef = useRef<HTMLDivElement>(null)
  const tabulatorRef = useRef<Tabulator | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Function to generate columns from data
  const generateColumns = (data: Array<Record<string, unknown>>) => {
    if (!data || data.length === 0) return []
    
    // Get all unique keys from all objects
    const allKeys = new Set<string>()
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key))
    })
    
    // Convert to column definitions
    return Array.from(allKeys).map(key => ({
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), // Convert camelCase to Title Case
      field: key,
      width: undefined, // Let Tabulator auto-size
      sortable: true,
      filterable: true
    }))
  }

  // Default options
  const defaultOptions = {
    height: 'auto', // Let Tabulator auto-size based on content
    maxHeight: '400px', // Maximum height before scrolling
    pagination: true,
    paginationSize: 10,
    layout: 'fitColumns' as const,
    movableColumns: true,
    resizableColumns: true,
    selectable: true,
    headerSort: true,
    placeholder: 'No data available',
    theme: 'default' // Can be overridden via widgetsOptions
  }

  // Merge with widget options
  const effectiveOptions = {
    ...defaultOptions,
    ...(widgetsOptions?.tabulator as Record<string, unknown> || {})
  }

  useEffect(() => {
    if (!tableRef.current || !source || !Array.isArray(source)) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Destroy existing table if it exists
      if (tabulatorRef.current) {
        tabulatorRef.current.destroy()
      }

      // Generate columns from data
      const columns = generateColumns(source)

      // Create new Tabulator instance
      const tabulator = new Tabulator(tableRef.current, {
        columns: columns,
        data: source,
        ...effectiveOptions
      })

      // Add event handlers after table creation
      tabulator.on('rowClick', (e: unknown, row: unknown) => {
        const tabulatorRow = row as TabulatorRow
        const rowData = tabulatorRow.getData()
        const rowIndex = tabulatorRow.getPosition()
        onWidgetCallback?.({
          type: 'tabulator:row_clicked',
          rowData: rowData,
          rowIndex: rowIndex
        })
      })

      tabulatorRef.current = tabulator

    } catch (err) {
      setError(`Failed to initialize table: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Tabulator initialization error:', err)
    } finally {
      setIsLoading(false)
    }

    // Cleanup function
    return () => {
      if (tabulatorRef.current) {
        tabulatorRef.current.destroy()
        tabulatorRef.current = null
      }
    }
  }, [source, effectiveOptions, onWidgetCallback])

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        <div>⏳</div>
        <div>Loading table...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px'
      }}>
        <div>❌</div>
        <div>{error}</div>
      </div>
    )
  }

  // Validate source data
  if (!source || !Array.isArray(source) || source.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        fontStyle: 'italic',
        fontSize: '14px'
      }}>
        No data available for table
      </div>
    )
  }

  // Extract maxHeight from options for container styling
  const maxHeight = effectiveOptions.maxHeight as string || '400px'

  return (
    <div style={{ 
      width: '100%',
      maxHeight: maxHeight,
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div ref={tableRef} style={{ width: '100%', flex: 1 }} />
    </div>
  )
}

// Export the instruction for this widget
export const TabulatorWidgetInstruction = {
  type: 'tabulator',
  instructions: 'Use this format when the user requests to display data in a table format with sorting, filtering, pagination, and interactive features. Perfect for displaying structured data like lists, datasets, reports, or any tabular information. The widget automatically generates columns based on the object properties in the data array. The table adapts to content size up to a maximum height limit.',
  sourceDataModel: 'an array of objects, where each object represents a row in the table. The property names of the objects will automatically become the column headers. All objects should have consistent property names for best results.'
}
