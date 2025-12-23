import React, { useState, useEffect } from 'react'
import { type FC } from 'react'

interface SliderWidgetProps {
  source: string | {
    label?: string
    min?: number
    max?: number
    step?: number
    initialValue?: number
    showValue?: boolean
    unit?: string
  }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const SliderWidgetComponent: FC<SliderWidgetProps> = ({
  source,
  onWidgetCallback,
  historyIndex
}) => {
  // Parse source to handle both string and object formats
  const sourceData = typeof source === 'string'
    ? {
        label: source,
        min: 0,
        max: 100,
        step: 1,
        initialValue: 50,
        showValue: true,
        unit: ''
      }
    : {
        label: source.label || 'Slider',
        min: source.min ?? 0,
        max: source.max ?? 100,
        step: source.step ?? 1,
        initialValue: source.initialValue ?? (source.min ?? 0),
        showValue: source.showValue !== false,
        unit: source.unit || ''
      }

  const [value, setValue] = useState(sourceData.initialValue)

  // Update value when source changes
  useEffect(() => {
    if (typeof source === 'object' && source.initialValue !== undefined) {
      setValue(source.initialValue)
    }
  }, [source])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    setValue(newValue)

    // Notify callback on change
    if (onWidgetCallback) {
      onWidgetCallback({
        type: 'slider:changed',
        value: newValue,
        min: sourceData.min,
        max: sourceData.max,
        step: sourceData.step,
        label: sourceData.label,
        unit: sourceData.unit,
        historyIndex
      })
    }
  }

  const getSliderStyles = (progressPercent: number) => {
    return {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      outline: 'none',
      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progressPercent}%, #e5e7eb ${progressPercent}%, #e5e7eb 100%)`,
      WebkitAppearance: 'none' as const,
      appearance: 'none' as const,
      cursor: 'pointer',
      transition: 'background 0.2s ease-in-out'
    }
  }

  const getThumbStyles = () => {
    return {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: '#3b82f6',
      cursor: 'pointer',
      border: '2px solid #ffffff',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      WebkitAppearance: 'none' as const,
      appearance: 'none' as const
    }
  }

  const getContainerStyles = () => {
    return {
      width: '100%',
      maxWidth: '400px',
      padding: '16px 0',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }

  const getLabelStyles = () => {
    return {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '12px',
      display: 'block'
    }
  }

  const getValueDisplayStyles = () => {
    return {
      fontSize: '16px',
      fontWeight: '600',
      color: '#3b82f6',
      marginTop: '8px',
      textAlign: 'center' as const
    }
  }

  // Calculate progress percentage for gradient
  const progress = ((value - sourceData.min) / (sourceData.max - sourceData.min)) * 100

  return (
    <div style={getContainerStyles()}>
      {sourceData.label && (
        <label style={getLabelStyles()}>
          {sourceData.label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={sourceData.min}
          max={sourceData.max}
          step={sourceData.step}
          value={value}
          onChange={handleChange}
          style={getSliderStyles(progress)}
          aria-label={sourceData.label || 'Slider'}
          aria-valuemin={sourceData.min}
          aria-valuemax={sourceData.max}
          aria-valuenow={value}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            ${Object.entries(getThumbStyles())
              .map(([key, val]) => {
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
                return `${cssKey}: ${val};`
              })
              .join('\n            ')}
          }
          input[type="range"]::-moz-range-thumb {
            ${Object.entries(getThumbStyles())
              .map(([key, val]) => {
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
                return `${cssKey}: ${val};`
              })
              .join('\n            ')}
          }
          input[type="range"]::-ms-thumb {
            ${Object.entries(getThumbStyles())
              .map(([key, val]) => {
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
                return `${cssKey}: ${val};`
              })
              .join('\n            ')}
          }
        `}</style>
      </div>
      {sourceData.showValue && (
        <div style={getValueDisplayStyles()}>
          {value}{sourceData.unit && ` ${sourceData.unit}`}
        </div>
      )}
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const SliderWidget = React.memo(SliderWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  const prevSource = prevProps.source
  const nextSource = nextProps.source

  // Compare source data (string or object)
  if (typeof prevSource === 'string' && typeof nextSource === 'string') {
    return prevSource === nextSource && prevProps.historyIndex === nextProps.historyIndex
  }

  if (typeof prevSource === 'object' && typeof nextSource === 'object') {
    return JSON.stringify(prevSource) === JSON.stringify(nextSource) &&
           prevProps.historyIndex === nextProps.historyIndex
  }

  // Different types, allow re-render
  return false
})

// Export the instruction for this widget
export const SliderWidgetInstruction = {
  type: 'slider',
  instructions: 'Use this widget when the user needs to select a numeric value within a range. The slider provides an intuitive way to adjust values and automatically notifies when the value changes.',
  sourceDataModel: {
    label: 'string (optional) - label displayed above the slider',
    min: 'number (optional) - minimum value (default: 0)',
    max: 'number (optional) - maximum value (default: 100)',
    step: 'number (optional) - step increment (default: 1)',
    initialValue: 'number (optional) - initial slider value (default: min value)',
    showValue: 'boolean (optional) - whether to display the current value (default: true)',
    unit: 'string (optional) - unit to display after the value (e.g., "px", "%", "kg")'
  }
}

