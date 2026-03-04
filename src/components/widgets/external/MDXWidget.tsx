import React, { useCallback, useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ListsToggle,
  BlockTypeSelect,
  Separator
} from '@mdxeditor/editor'

interface MDXWidgetProps {
  source: string | { markdown?: string }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const getMarkdownFromSource = (source: MDXWidgetProps['source']): string => {
  if (typeof source === 'string') {
    return source
  }
  if (source && typeof source === 'object' && 'markdown' in source) {
    return (source.markdown as string) || ''
  }
  return ''
}

const MDXWidgetComponent: FC<MDXWidgetProps> = ({
  source,
  onWidgetCallback,
  historyIndex
}) => {
  const initialMarkdown = getMarkdownFromSource(source)
  const [markdown, setMarkdown] = useState<string>(initialMarkdown)
  const lastSourceRef = useRef<string>(initialMarkdown)
  const cssLoadedRef = useRef<boolean>(false)

  // Dynamically load MDXEditor CSS
  useEffect(() => {
    if (!cssLoadedRef.current && typeof window !== 'undefined') {
      // Try to load CSS from node_modules, fallback to CDN if needed
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      // Try local path first (for development/build), fallback to CDN
      try {
        // In a bundled environment, we'll need to use a CDN or inline styles
        // For now, use CDN as fallback since build system doesn't handle CSS imports
        link.href = 'https://unpkg.com/@mdxeditor/editor@3.52.1/dist/style.css'
      } catch (e) {
        console.warn('Could not load MDXEditor CSS:', e)
      }
      link.onload = () => {
        cssLoadedRef.current = true
      }
      link.onerror = () => {
        console.warn('Failed to load MDXEditor CSS from CDN')
      }
      document.head.appendChild(link)
      
      return () => {
        // Cleanup: remove the stylesheet when component unmounts
        const existingLink = document.querySelector(`link[href="${link.href}"]`)
        if (existingLink && existingLink.parentNode) {
          existingLink.parentNode.removeChild(existingLink)
        }
      }
    }
  }, [])

  // Sync with source prop when it changes externally
  useEffect(() => {
    // Only update if source-derived markdown changed externally
    const incomingMarkdown = getMarkdownFromSource(source)
    if (incomingMarkdown !== undefined && incomingMarkdown !== lastSourceRef.current) {
      lastSourceRef.current = incomingMarkdown
      setMarkdown(incomingMarkdown)
    }
  }, [source])

  // Handle markdown changes from MDXEditor
  const handleChange = useCallback(
    (newMarkdown: string) => {
      setMarkdown(newMarkdown)

      // Notify host app / registry wrapper so history can be updated
      onWidgetCallback?.({
        type: 'mdx:changed',
        value: newMarkdown
      })
    },
    [onWidgetCallback]
  )


  // Handle empty or invalid source
  if (source === undefined || source === null) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        No markdown content provided
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <MDXEditor
        markdown={markdown}
        onChange={handleChange}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <Separator />
                <ListsToggle />
                <Separator />
                <BlockTypeSelect />
              </>
            )
          })
        ]}
      />
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const MDXWidget = React.memo(MDXWidgetComponent, (prevProps, nextProps) => {
  const prevSourceMarkdown = getMarkdownFromSource(prevProps.source)
  const nextSourceMarkdown = getMarkdownFromSource(nextProps.source)

  return (
    prevSourceMarkdown === nextSourceMarkdown &&
    prevProps.historyIndex === nextProps.historyIndex
  )
})

// Export the instruction for this widget
export const MDXWidgetInstruction = {
  type: 'mdx',
  instructions: 'Use this widget when the user needs to edit markdown content visually. This widget provides a WYSIWYG markdown editor with a toolbar for formatting options including headers, bold, italic, lists, links, images, tables, and more. The content can be edited directly in the rendered view.',
  sourceDataModel: {
    markdown: 'string - The markdown text content to be displayed and edited'
  }
}

