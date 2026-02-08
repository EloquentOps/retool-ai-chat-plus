import React, { useEffect, useMemo, useRef, useState } from 'react'
import { type FC } from 'react'
import * as echarts from 'echarts'

interface ChartWidgetProps {
  source: echarts.EChartsOption | string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const ChartWidgetComponent: FC<ChartWidgetProps> = ({ 
  source, 
  onWidgetCallback, 
  widgetsOptions,
  historyIndex: _historyIndex 
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const resizeHandlerRef = useRef<(() => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Default options
  const defaultOptions = {
    height: '400px',
    width: '100%',
    theme: 'default' as const,
    responsive: true
  }

  // Merge with widget options (use useMemo to stabilize reference)
  const effectiveOptions = useMemo(() => ({
    ...defaultOptions,
    ...(widgetsOptions?.chart as Record<string, unknown> || {})
  }), [widgetsOptions?.chart])

  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    // Parse source if it's a string
    let chartOptions: echarts.EChartsOption
    
    try {
      if (typeof source === 'string') {
        chartOptions = JSON.parse(source)
      } else {
        chartOptions = source
      }
    } catch (err) {
      setError(`Invalid chart configuration: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
      return
    }

    // Validate that we have a valid options object
    if (!chartOptions || typeof chartOptions !== 'object') {
      setError('Invalid chart configuration: source must be a valid ECharts options object')
      setIsLoading(false)
      return
    }

    // Check if we already have a chart instance
    if (chartInstanceRef.current) {
      const currentOptions = chartInstanceRef.current.getOption()
      
      // Simple comparison - check if options are the same
      if (JSON.stringify(currentOptions) === JSON.stringify(chartOptions)) {
        console.log('ChartWidget: Options appear unchanged, skipping chart recreation')
        return
      }
      
      // Options have changed, update existing chart instead of recreating
      console.log('ChartWidget: Updating existing chart with new options')
      try {
        chartInstanceRef.current.setOption(chartOptions, { notMerge: false })
        
        // Resize to ensure chart uses full container width
        chartInstanceRef.current.resize()
        
        return
      } catch (err) {
        console.warn('ChartWidget: Failed to update existing chart, will recreate:', err)
        // Fall through to recreate the chart
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      // Destroy existing chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }

      // Initialize ECharts instance
      // Don't pass width/height - let it use container dimensions
      const chartInstance = echarts.init(
        chartRef.current,
        effectiveOptions.theme === 'default' ? undefined : effectiveOptions.theme as string,
        {
          renderer: 'canvas'
        }
      )

      // Set chart options
      chartInstance.setOption(chartOptions, { notMerge: true })

      // Resize to ensure chart uses full container width
      chartInstance.resize()

      // Handle responsive resize if enabled
      if (effectiveOptions.responsive) {
        // Remove existing resize handler if any
        if (resizeHandlerRef.current) {
          window.removeEventListener('resize', resizeHandlerRef.current)
        }
        
        resizeHandlerRef.current = () => {
          chartInstance.resize()
        }
        window.addEventListener('resize', resizeHandlerRef.current)
      }

      // Add event listener for chart data point clicks
      chartInstance.on('click', (params: unknown) => {
        const clickParams = params as {
          data: unknown
          seriesName?: string
          name?: string
          dataIndex?: number
          seriesIndex?: number
        }
        onWidgetCallback?.({
          type: 'chart:clicked',
          value: JSON.stringify({
            data: clickParams.data,
            seriesName: clickParams.seriesName,
            name: clickParams.name,
            dataIndex: clickParams.dataIndex,
            seriesIndex: clickParams.seriesIndex
          })
        })
      })

      chartInstanceRef.current = chartInstance

    } catch (err) {
      setError(`Failed to initialize chart: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('ChartWidget initialization error:', err)
    } finally {
      setIsLoading(false)
    }

    // Cleanup function
    return () => {
      // Remove resize listener if it was added
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current)
        resizeHandlerRef.current = null
      }
      
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
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
        fontSize: '14px',
        height: effectiveOptions.height as string || '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div>⏳</div>
        <div>Loading chart...</div>
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
        fontSize: '14px',
        minHeight: effectiveOptions.height as string || '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div>❌</div>
        <div>{error}</div>
      </div>
    )
  }

  // Get height and width from options
  const chartHeight = effectiveOptions.height as string || '400px'
  const chartWidth = effectiveOptions.width as string || '100%'

  return (
    <div style={{ 
      width: chartWidth,
      height: chartHeight,
      //border: '1px solid #e5e7eb',
      //borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '300px', position: 'relative' }} />
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const ChartWidget = React.memo(ChartWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  const prevSource = prevProps.source
  const nextSource = nextProps.source
  
  // Compare source data (ECharts options)
  if (typeof prevSource === 'string' && typeof nextSource === 'string') {
    // String comparison
    if (prevSource !== nextSource) {
      return false // Source changed, allow re-render
    }
  } else if (typeof prevSource === 'object' && typeof nextSource === 'object') {
    // Object comparison using JSON.stringify
    if (JSON.stringify(prevSource) !== JSON.stringify(nextSource)) {
      return false // Source changed, allow re-render
    }
  } else {
    // Different types, allow re-render
    return false
  }
  
  // Compare widgetsOptions for chart specific settings
  const prevOptions = prevProps.widgetsOptions?.chart as Record<string, unknown>
  const nextOptions = nextProps.widgetsOptions?.chart as Record<string, unknown>
  
  if (JSON.stringify(prevOptions) !== JSON.stringify(nextOptions)) {
    return false // Options changed, allow re-render
  }
  
  // Compare historyIndex
  if (prevProps.historyIndex !== nextProps.historyIndex) {
    return false // History index changed, allow re-render
  }
  
  // Props are the same, prevent re-render
  return true
})

// Export the instruction for this widget
export const ChartWidgetInstruction = {
  type: 'chart',
  instructions: 'Use this widget when the user requests to visualize data in a chart format such as line charts, bar charts, pie charts, scatter plots, or any other data visualization. Perfect for displaying trends, comparisons, distributions, or relationships in data. Supports all ECharts chart types including line, bar, pie, scatter, radar, heatmap, treemap, sunburst, gauge, and more.',
  sourceDataModel: {
    title: {
      text: 'The title of the chart (string, optional)',
      subtext: 'The subtitle of the chart (string, optional)'
    },
    tooltip: {
      trigger: 'The trigger type: "item", "axis", or "none" (string, optional)'
    },
    legend: {
      data: 'Array of series names for the legend (array of strings, optional)'
    },
    xAxis: {
      type: 'The x-axis type: "category", "value", "time", or "log" (string, optional)',
      data: 'Array of category names for category axis (array, optional)'
    },
    yAxis: {
      type: 'The y-axis type: "value", "category", "time", or "log" (string, optional)'
    },
    series: 'Array of series objects. Each series object should have at least: { name: string, type: string (e.g., "line", "bar", "pie", "scatter"), data: array } (array, required)'
  }
}

