import React, { useState } from 'react'
import { type FC } from 'react'

interface ImageWidgetProps {
  source: string
  alt?: string
  width?: number
  height?: number
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

export const ImageWidget: FC<ImageWidgetProps> = ({ 
  source, 
  alt = '', 
  width, 
  height 
}) => {
  const [isZoomed, setIsZoomed] = useState(false)

  const handleImageClick = () => {
    setIsZoomed(!isZoomed)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomed(false)
    }
  }

  const originalStyles = {
    maxWidth: width ? `${width}px` : '200px',
    maxHeight: height ? `${height}px` : 'auto',
    borderRadius: '4px',
    display: 'block',
    margin: '4px 0',
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
    transform: 'scale(1)',
    zIndex: 1
  }

  const zoomedStyles = {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) scale(1)',
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: 'auto',
    height: 'auto',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
    zIndex: 1000,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
  }

  const backdropStyles = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 999,
    cursor: 'pointer',
    transition: 'opacity 0.3s ease-in-out'
  }

  return (
    <>
      <img 
        src={source}
        alt={alt}
        style={isZoomed ? zoomedStyles : originalStyles}
        onClick={handleImageClick}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          console.error('Failed to load image:', source)
        }}
      />
      {isZoomed && (
        <div 
          style={backdropStyles}
          onClick={handleBackdropClick}
        />
      )}
    </>
  )
}

// Export the instruction for this widget
export const ImageWidgetInstruction = `- **Format type: "image"**:
The source value should be a valid URL pointing to an image file.
Supported formats: jpg, jpeg, png, gif, webp, svg.`
