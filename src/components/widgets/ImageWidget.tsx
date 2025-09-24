import React from 'react'
import { type FC } from 'react'

interface ImageWidgetProps {
  src: string
  alt?: string
  width?: number
  height?: number
}

export const ImageWidget: FC<ImageWidgetProps> = ({ 
  src, 
  alt = '', 
  width, 
  height 
}) => {
  return (
    <img 
      src={src}
      alt={alt}
      style={{
        maxWidth: width ? `${width}px` : '200px',
        maxHeight: height ? `${height}px` : 'auto',
        borderRadius: '4px',
        display: 'block',
        margin: '4px 0'
      }}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.style.display = 'none'
        console.error('Failed to load image:', src)
      }}
    />
  )
}

// Export the instruction for this widget
export const ImageWidgetInstruction = `
Format type: "image".
The source value should be a valid URL pointing to an image file.
Supported formats: jpg, jpeg, png, gif, webp, svg.
`
