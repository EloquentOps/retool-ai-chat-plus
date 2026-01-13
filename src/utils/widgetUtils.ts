// Helper function to format widget key into display name
export const formatWidgetDisplayName = (key: string): string => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * Pre-processes AI response string to encode HTML content in canvas widget sources to base64.
 * This prevents JSON parsing failures from special characters in HTML.
 * 
 * Always encodes HTML content in canvas widget sources to base64, regardless of current encoding state.
 * 
 * @param responseString - The raw AI response string that may contain JSON with canvas widget HTML
 * @returns The response string with HTML content in canvas widget sources encoded to base64
 */
export function preprocessCanvasWidgetHtml(responseString: string): string {
  try {
    // First, try to parse as JSON and process the structure
    try {
      const parsed = JSON.parse(responseString)
      
      // Recursively find and encode canvas widget HTML
      const encodeCanvasHtml = (obj: unknown): unknown => {
        if (Array.isArray(obj)) {
          return obj.map(encodeCanvasHtml)
        } else if (obj !== null && typeof obj === 'object') {
          const objRecord = obj as Record<string, unknown>
          const result: Record<string, unknown> = {}
          
          // Check if this is a canvas widget
          if (objRecord.type === 'canvas') {
            // This is a canvas widget, always encode the source HTML to base64
            if (objRecord.source) {
              if (typeof objRecord.source === 'string') {
                // Direct string source - always encode to base64
                try {
                  result.source = btoa(unescape(encodeURIComponent(objRecord.source)))
                } catch (error) {
                  console.warn('Failed to encode canvas widget source to base64:', error)
                  result.source = objRecord.source
                }
              } else if (typeof objRecord.source === 'object' && objRecord.source !== null) {
                // Object format: {html: "..."}
                const sourceObj = objRecord.source as { html?: string; [key: string]: unknown }
                if (sourceObj.html && typeof sourceObj.html === 'string') {
                  try {
                    result.source = {
                      ...sourceObj,
                      html: btoa(unescape(encodeURIComponent(sourceObj.html)))
                    }
                  } catch (error) {
                    console.warn('Failed to encode canvas widget html to base64:', error)
                    result.source = objRecord.source
                  }
                } else {
                  result.source = objRecord.source
                }
              } else {
                result.source = objRecord.source
              }
            }
            // Copy other properties
            for (const [key, value] of Object.entries(objRecord)) {
              if (key !== 'source') {
                result[key] = encodeCanvasHtml(value)
              }
            }
          } else {
            // Not a canvas widget, process all properties normally
            for (const [key, value] of Object.entries(objRecord)) {
              result[key] = encodeCanvasHtml(value)
            }
          }
          return result
        }
        return obj
      }
      
      const processed = encodeCanvasHtml(parsed)
      return JSON.stringify(processed)
    } catch (parseError) {
      // If JSON parsing fails, fall back to regex-based approach
      // This handles malformed JSON that we're trying to fix
      console.warn('JSON parsing failed, using regex fallback:', parseError)
    }
    
    // Fallback: Use regex to find and encode HTML in canvas widget sources
    // This handles cases where JSON is malformed and can't be parsed
    // Note: This is a fallback - ideally JSON parsing should succeed
    let processedString = responseString
    
    // Find canvas widgets and their source fields
    // Look for "type":"canvas" followed by "source":"..." 
    // We need to match the entire source value including escaped quotes
    const canvasWidgetWithSource = /"type"\s*:\s*"canvas"[\s\S]*?"source"\s*:\s*"((?:[^"\\]|\\.)*)"/gi
    
    const replacements: Array<{ start: number; end: number; replacement: string }> = []
    let match
    
    canvasWidgetWithSource.lastIndex = 0
    
    while ((match = canvasWidgetWithSource.exec(responseString)) !== null) {
      const fullMatch = match[0]
      const sourceValue = match[1] // The content inside the quotes (with escaped sequences)
      const matchStart = match.index
      const matchEnd = matchStart + fullMatch.length
      
      if (sourceValue) {
        try {
          // Unescape JSON string (convert \" to ", \\ to \, \n to newline, etc.)
          const unescapedContent = sourceValue.replace(/\\(.)/g, (_, char) => {
            switch (char) {
              case 'n': return '\n'
              case 'r': return '\r'
              case 't': return '\t'
              case '\\': return '\\'
              case '"': return '"'
              case '/': return '/'
              case 'b': return '\b'
              case 'f': return '\f'
              case 'u': return '' // Handle \uXXXX later if needed
              default: return char
            }
          })
          
          // Encode to base64
          const base64Html = btoa(unescape(encodeURIComponent(unescapedContent)))
          
          // Create replacement: replace the source value with base64
          const beforeSource = fullMatch.substring(0, fullMatch.indexOf('"source"') + '"source":'.length)
          const afterSource = fullMatch.substring(fullMatch.lastIndexOf('"'))
          const replacement = `${beforeSource}"${base64Html}"${afterSource}`
          
          replacements.push({
            start: matchStart,
            end: matchEnd,
            replacement: replacement
          })
        } catch (error) {
          // Encoding failed, skip this one
          console.warn('Failed to encode canvas widget source in regex fallback:', error)
        }
      }
    }
    
    // Also handle object format: "source":{"html":"..."}
    const canvasWidgetWithHtml = /"type"\s*:\s*"canvas"[\s\S]*?"source"\s*:\s*\{[^}]*"html"\s*:\s*"((?:[^"\\]|\\.)*)"/gi
    
    canvasWidgetWithHtml.lastIndex = 0
    
    while ((match = canvasWidgetWithHtml.exec(responseString)) !== null) {
      const fullMatch = match[0]
      const htmlValue = match[1]
      const matchStart = match.index
      const matchEnd = matchStart + fullMatch.length
      
      if (htmlValue) {
        try {
          // Unescape JSON string
          const unescapedContent = htmlValue.replace(/\\(.)/g, (_, char) => {
            switch (char) {
              case 'n': return '\n'
              case 'r': return '\r'
              case 't': return '\t'
              case '\\': return '\\'
              case '"': return '"'
              case '/': return '/'
              case 'b': return '\b'
              case 'f': return '\f'
              default: return char
            }
          })
          
          // Encode to base64
          const base64Html = btoa(unescape(encodeURIComponent(unescapedContent)))
          
          // Find the "html" field and replace its value
          const htmlFieldMatch = fullMatch.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/)
          if (htmlFieldMatch) {
            const beforeHtml = fullMatch.substring(0, htmlFieldMatch.index!)
            const afterHtml = fullMatch.substring(htmlFieldMatch.index! + htmlFieldMatch[0].length)
            const replacement = `${beforeHtml}"html":"${base64Html}"${afterHtml}`
            
            replacements.push({
              start: matchStart,
              end: matchEnd,
              replacement: replacement
            })
          }
        } catch (error) {
          console.warn('Failed to encode canvas widget html in regex fallback:', error)
        }
      }
    }
    
    // Apply replacements in reverse order to preserve indices
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { start, end, replacement } = replacements[i]
      processedString = processedString.substring(0, start) + replacement + processedString.substring(end)
    }
    
    return processedString
  } catch (error) {
    // If pre-processing fails, return original string
    console.warn('Failed to pre-process canvas widget HTML:', error)
    return responseString
  }
}

// Check whether an item with `id` is present in promotedWidgets for given widgetType
export const isPromoted = (promotedWidgets?: Record<string, unknown>, widgetType?: string, id?: string | number): boolean => {
  if (!promotedWidgets || !widgetType || id === undefined || id === null) return false
  const list = promotedWidgets[widgetType] as unknown
  if (!list || !Array.isArray(list)) return false
  try {
    return (list as Array<any>).some((item) => {
      if (!item) return false
      if (item.id !== undefined && item.id === id) return true
      // Fallback: match by competitorName for battlecard items
      if (item.competitorName !== undefined && item.competitorName === id) return true
      return false
    })
  } catch (e) {
    return false
  }
}
