import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'

interface TextWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

export const TextWidget: FC<TextWidgetProps> = ({ source }) => {
  return (
    <div style={{
      fontSize: '14px',
      lineHeight: '1.6',
      color: '#333333',
      wordWrap: 'break-word',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  )
}

// Export the instruction for this widget
export const TextWidgetInstruction = `- **Format type: "text"**:
Use this format when the answer is text or markdown that needs to be displayed as is.
The source property value can be text or markdown syntax including headers (#), bold (**text**), italic (*text*), lists (- item), code blocks, and links ([text](url)).
YOU MUST encode all the new lines as \\n.`

