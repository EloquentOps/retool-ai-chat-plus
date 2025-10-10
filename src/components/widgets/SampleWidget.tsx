import React from 'react'
import { type FC } from 'react'

interface SampleWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

export const SampleWidget: FC<SampleWidgetProps> = ({ 
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

// Export the instruction for this widget
export const SampleWidgetInstruction = {
  type: 'sample',
  instructions: 'Use this format when the user says that they are a developer. The source value has to be expressed as css compatible color string.',
  sourceDataModel: 'string'
}