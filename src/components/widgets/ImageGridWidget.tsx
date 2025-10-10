import React from 'react'
import { type FC } from 'react'

interface ImageItem {
  imageUrl: string
  caption?: string
}

interface ImageGridWidgetProps {
  source: ImageItem[]
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

export const ImageGridWidget: FC<ImageGridWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  historyIndex 
}) => {
  const handleImageClick = (imageItem: ImageItem, index: number) => {
    if (onWidgetCallback) {
      onWidgetCallback({
        type: 'image_grid:changed',
        image: imageItem,
        index: index
      })
    }
  }

  // Grid container styles
  const gridContainerStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    maxWidth: '100%',
    width: '100%',
    boxSizing: 'border-box'
  }

  // Individual image item styles
  const imageItemStyles: React.CSSProperties = {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    backgroundColor: '#f5f5f5'
  }

  // Image styles with CSS cover mode
  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block'
  }

  // Caption styles
  const captionStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
    color: 'white',
    padding: '12px 8px 8px 8px',
    fontSize: '14px',
    lineHeight: '1.4',
    textAlign: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out'
  }

  // Hover styles for the image item
  const imageItemHoverStyles: React.CSSProperties = {
    transform: 'scale(1.02)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  }

  // Error handling for failed image loads
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
    console.error('Failed to load image:', target.src)
  }

  // Validate source data
  if (!Array.isArray(source) || source.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        fontStyle: 'italic'
      }}>
        No images to display
      </div>
    )
  }

  return (
    <div style={gridContainerStyles}>
      {source.map((imageItem, index) => (
        <div
          key={index}
          style={imageItemStyles}
          onClick={() => handleImageClick(imageItem, index)}
          onMouseEnter={(e) => {
            const target = e.currentTarget
            const caption = target.querySelector('.image-caption') as HTMLElement
            if (caption) {
              caption.style.opacity = '1'
            }
            Object.assign(target.style, imageItemHoverStyles)
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget
            const caption = target.querySelector('.image-caption') as HTMLElement
            if (caption) {
              caption.style.opacity = '0'
            }
            target.style.transform = 'scale(1)'
            target.style.boxShadow = 'none'
          }}
        >
          <img
            src={imageItem.imageUrl}
            alt={imageItem.caption || `Image ${index + 1}`}
            style={imageStyles}
            onError={handleImageError}
            loading="lazy"
          />
          {imageItem.caption && (
            <div className="image-caption" style={captionStyles}>
              {imageItem.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Export the instruction for this widget
export const ImageGridWidgetInstruction = {
  type: 'image_grid',
  instructions: 'Use this format when the user ask to show a list of images.',
  sourceDataModel: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the image to display'
        },
        caption: {
          type: 'string',
          description: 'Optional caption text to display over the image'
        }
      },
      required: ['imageUrl']
    }
  }
}

