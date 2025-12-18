import React from 'react'
import { type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

interface TextWidgetProps {
  source: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

// Function to process special mention patterns like @[Image](image) to @Image in bold
const processSpecialMentions = (text: string): string => {
  // Match patterns like @[WidgetName](widget_type) and replace with **@WidgetName**
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '**@$1**')
}

// Custom link component that opens links in a new window
// eslint-disable-next-line react/prop-types
const LinkComponent: Components['a'] = ({ href, children, ...props }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  )
}

const TextWidgetComponent: FC<TextWidgetProps> = ({ source }) => {
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
          .text-widget pre {
            background-color: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
            margin: 16px 0;
            font-size: 13px;
            line-height: 1.45;
            font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'Courier', monospace;
          }
          .text-widget pre code {
            background-color: transparent;
            border: none;
            padding: 0;
            font-size: inherit;
            color: inherit;
            white-space: pre;
            word-wrap: normal;
            display: inline;
            max-width: auto;
            overflow: visible;
          }
          .text-widget code {
            background-color: rgba(175, 184, 193, 0.2);
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 85%;
            font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'Courier', monospace;
            color: #e83e8c;
          }
          .text-widget pre code {
            background-color: transparent;
            color: #24292e;
            padding: 0;
            border-radius: 0;
          }
        `}
      </style>
      <div className="text-widget">
        <ReactMarkdown
          components={{
            a: LinkComponent
          }}
        >
          {processedSource}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const TextWidget = React.memo(TextWidgetComponent, (prevProps, nextProps) => {
  // Simple comparison for text widget - only re-render if source text changes
  return prevProps.source === nextProps.source && prevProps.historyIndex === nextProps.historyIndex
})

// Export the instruction for this widget
export const TextWidgetInstruction = {
  type: 'text',
  instructions: 'Use this format when the answer is text or markdown that needs to be displayed as is. The source property value can be text or markdown syntax including headers (#), bold (**text**), italic (*text*), lists (- item), code blocks, and links ([text](url)). YOU MUST encode all the new lines as \\n.',
  sourceDataModel: 'string'
}

