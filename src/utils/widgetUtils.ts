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
 * Strategy: Find canvas widget entries and encode HTML content in their source fields.
 * Uses a two-pass approach: first try to parse as JSON and process, if that fails,
 * use regex to find and encode HTML content.
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
            // This is a canvas widget, check the source
            if (objRecord.source) {
              if (typeof objRecord.source === 'string') {
                // Direct string source with HTML
                if (/<[^>]+>/.test(objRecord.source)) {
                  // Check if already base64
                  if (!objRecord.source.match(/^[A-Za-z0-9+/=]+$/) || objRecord.source.includes('<')) {
                    try {
                      result.source = btoa(unescape(encodeURIComponent(objRecord.source)))
                    } catch {
                      result.source = objRecord.source
                    }
                  } else {
                    result.source = objRecord.source
                  }
                } else {
                  result.source = objRecord.source
                }
              } else if (typeof objRecord.source === 'object' && objRecord.source !== null) {
                // Object format: {html: "..."}
                const sourceObj = objRecord.source as { html?: string; [key: string]: unknown }
                if (sourceObj.html && typeof sourceObj.html === 'string' && /<[^>]+>/.test(sourceObj.html)) {
                  // Check if already base64
                  if (!sourceObj.html.match(/^[A-Za-z0-9+/=]+$/) || sourceObj.html.includes('<')) {
                    try {
                      result.source = {
                        ...sourceObj,
                        html: btoa(unescape(encodeURIComponent(sourceObj.html)))
                      }
                    } catch {
                      result.source = objRecord.source
                    }
                  } else {
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
    } catch {
      // If JSON parsing fails, fall back to regex-based approach
      // This handles malformed JSON that we're trying to fix
    }
    
    // Fallback: Use regex to find and encode HTML in canvas widget sources
    // This is less reliable but handles cases where JSON is malformed
    let processedString = responseString
    
    // Find "type":"canvas" entries and encode their source HTML
    // Pattern: "type":"canvas"... "source":"<html>"
    const canvasPattern = /"type"\s*:\s*"canvas"([\s\S]*?)(?="type"|"widgets"|$)/gi
    
    let match
    while ((match = canvasPattern.exec(responseString)) !== null) {
      const widgetContent = match[0]
      
      // Look for source field with HTML content
      const sourceStringMatch = widgetContent.match(/"source"\s*:\s*"([^"]*(?:<[^>]+>[^"]*)+[^"]*)"/i)
      if (sourceStringMatch) {
        const htmlContent = sourceStringMatch[1]
        if (htmlContent && /<[^>]+>/.test(htmlContent)) {
          // Check if already base64
          if (!htmlContent.match(/^[A-Za-z0-9+/=]+$/) || htmlContent.includes('<')) {
            try {
              const base64Html = btoa(unescape(encodeURIComponent(htmlContent)))
              const replacement = widgetContent.replace(
                /"source"\s*:\s*"[^"]*"/i,
                `"source":"${base64Html}"`
              )
              processedString = processedString.replace(widgetContent, replacement)
            } catch {
              // Encoding failed, skip this one
            }
          }
        }
      }
      
      // Also check for object format: "source":{"html":"<html>"}
      const sourceObjectMatch = widgetContent.match(/"source"\s*:\s*\{[^}]*"html"\s*:\s*"([^"]*(?:<[^>]+>[^"]*)+[^"]*)"/i)
      if (sourceObjectMatch) {
        const htmlContent = sourceObjectMatch[1]
        if (htmlContent && /<[^>]+>/.test(htmlContent)) {
          // Check if already base64
          if (!htmlContent.match(/^[A-Za-z0-9+/=]+$/) || htmlContent.includes('<')) {
            try {
              const base64Html = btoa(unescape(encodeURIComponent(htmlContent)))
              const replacement = widgetContent.replace(
                /"html"\s*:\s*"[^"]*"/i,
                `"html":"${base64Html}"`
              )
              processedString = processedString.replace(widgetContent, replacement)
            } catch {
              // Encoding failed, skip this one
            }
          }
        }
      }
    }
    
    return processedString
  } catch (error) {
    // If pre-processing fails, return original string
    console.warn('Failed to pre-process canvas widget HTML:', error)
    return responseString
  }
}
