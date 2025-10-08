import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'

interface TextWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

// Function to process special mention patterns like @[Image](image) to @Image in bold
const processSpecialMentions = (text: string): string => {
  // Match patterns like @[WidgetName](widget_type) and replace with **@WidgetName**
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '**@$1**')
}

export const TextWidget: FC<TextWidgetProps> = ({ source }) => {
  // Process the source text to handle special mentions
  const processedSource = processSpecialMentions(source)
  
  return (
    <div style={{
      fontSize: '14px',
      lineHeight: '1.6',
      color: '#333333',
      wordWrap: 'break-word',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>
        {`
          .text-widget p:first-child {
            margin-top: 0;
          }
          .text-widget p:last-child {
            margin-bottom: 0;
          }
        `}
      </style>
      <div className="text-widget">
        <ReactMarkdown>{processedSource}</ReactMarkdown>
      </div>
    </div>
  )
}

// Export the instruction for this widget
export const TextWidgetInstruction = {
  type: 'text',
  instructions: 'Use this format when the answer is text or markdown that needs to be displayed as is. The source property value can be text or markdown syntax including headers (#), bold (**text**), italic (*text*), lists (- item), code blocks, and links ([text](url)). YOU MUST encode all the new lines as \\n.',
  sourceDataModel: 'string'
}

