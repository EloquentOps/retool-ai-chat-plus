import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'

interface TextWidgetProps {
  content: string
}

export const TextWidget: FC<TextWidgetProps> = ({ content }) => {
  return (
    <div style={{
      fontSize: '14px',
      lineHeight: '1.6',
      color: '#333333',
      wordWrap: 'break-word',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

// Export the instruction for this widget
export const TextWidgetInstruction = `Format type: "text".
The source value can be text or markdown syntax including headers (#), bold (**text**), italic (*text*), lists (- item), code blocks, and links ([text](url)).
YOU MUST encode all the new lines as \\n.`
