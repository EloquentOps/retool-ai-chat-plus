import React from 'react'
import { type FC } from 'react'

interface SampleWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const SampleWidgetComponent: FC<SampleWidgetProps> = ({ 
  source,
  historyIndex
}) => {
  return (
    <div style={{
      width: `100%`,
      height: `75px`,
      backgroundColor: source,
      border: '1px solid #000',
      borderRadius: '6px',
      display: 'inline-block',
      margin: '6px 0'
    }} />
  )
}

// Memoized component to prevent unnecessary re-renders
export const SampleWidget = React.memo(SampleWidgetComponent, (prevProps, nextProps) => {
  // Simple comparison for sample widget - only re-render if source color changes
  return prevProps.source === nextProps.source && prevProps.historyIndex === nextProps.historyIndex
})

// Export the instruction for this widget
export const SampleWidgetInstruction = {
  type: 'sample',
  instructions: 'Use this format when the user says that they are a developer. The source value has to be expressed as css compatible color string.',
  sourceDataModel: 'string'
}