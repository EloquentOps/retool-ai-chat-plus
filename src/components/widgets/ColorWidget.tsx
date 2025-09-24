import React from 'react'
import { type FC } from 'react'

interface ColorWidgetProps {
  color: string
  width?: number
  height?: number
}

export const ColorWidget: FC<ColorWidgetProps> = ({ 
  color, 
  width = 100, 
  height = 50 
}) => {
  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: color,
      border: '1px solid #ccc',
      borderRadius: '4px',
      display: 'inline-block',
      margin: '4px 0'
    }} />
  )
}

// Export the instruction for this widget
export const ColorWidgetInstruction = `
Format type: "color".
The source value has to be expressed as css compatible color string.
`