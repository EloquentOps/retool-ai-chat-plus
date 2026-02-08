import React, { useState } from 'react'
import { type FC } from 'react'

interface VideoWidgetProps {
  source: string | {
    url: string
    title?: string
  }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const VideoWidgetComponent: FC<VideoWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  historyIndex: _historyIndex 
}) => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Handle both string URL and object format
  const videoUrl = typeof source === 'string' ? source : source.url
  const videoTitle = typeof source === 'object' ? source.title : undefined

  const handleLoadedData = () => {
    setIsLoading(false)
    setError(null)
    onWidgetCallback?.({ type: 'video:loaded', value: videoUrl })
  }

  const handleError = () => {
    setIsLoading(false)
    const errorMessage = `Failed to load video: ${videoUrl}`
    setError(errorMessage)
    onWidgetCallback?.({ type: 'video:error', value: errorMessage })
  }

  const handlePlay = () => {
    onWidgetCallback?.({ type: 'video:play', value: videoUrl })
  }

  const handlePause = () => {
    onWidgetCallback?.({ type: 'video:pause', value: videoUrl })
  }

  const handleEnded = () => {
    onWidgetCallback?.({ type: 'video:ended', value: videoUrl })
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
        <div>{error}</div>
      </div>
    )
  }

  const videoStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    borderRadius: '4px',
    display: 'block',
    margin: '4px 0',
    backgroundColor: '#000'
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
          color: '#fff',
          fontSize: '14px'
        }}>
          ⏳ Loading video...
        </div>
      )}
      {videoTitle && (
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '4px',
          color: '#333333'
        }}>
          {videoTitle}
        </div>
      )}
      <video
        src={videoUrl}
        controls
        style={videoStyles}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const VideoWidget = React.memo(VideoWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  if (typeof prevProps.source === 'string' && typeof nextProps.source === 'string') {
    return prevProps.source === nextProps.source && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  if (typeof prevProps.source === 'object' && typeof nextProps.source === 'object') {
    return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source) && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  // Different types, allow re-render
  return false
})

// Export the instruction for this widget
export const VideoWidgetInstruction = {
  type: 'video',
  instructions: 'Use this widget when the user requests to display a video. The source value should be a valid URL pointing to a video file. Supported formats: mp4, webm, ogg, mov. You can also provide an object with url and optional title property.',
  sourceDataModel: 'string | { url: string, title?: string }'
}

