import React, { useState } from 'react'
import { type FC } from 'react'
import { TextWidget, TextWidgetInstruction } from './TextWidget'
import { SampleWidget, SampleWidgetInstruction } from './SampleWidget'
import { ImageWidget, ImageWidgetInstruction } from './ImageWidget'
import { GoogleMapWidget, GoogleMapWidgetInstruction } from './GoogleMapWidget'
import { ConfirmWidget, ConfirmWidgetInstruction } from './ConfirmWidget'
import { SelectWidget, SelectWidgetInstruction } from './SelectWidget'
import { ImageGridWidget, ImageGridWidgetInstruction } from './ImageGridWidget'
import { TabulatorWidget, TabulatorWidgetInstruction } from './TabulatorWidget'
import { InputWidget, InputWidgetInstruction } from './InputWidget'
import { ChartWidget, ChartWidgetInstruction } from './ChartWidget'
import { CheckListWidget, CheckListWidgetInstruction } from './CheckListWidget'
import { FullCalendarWidget, FullCalendarWidgetInstruction } from './FullCalendarWidget'
import { VideoWidget, VideoWidgetInstruction } from './VideoWidget'
import { MermaidWidget, MermaidWidgetInstruction } from './MermaidWidget'

// Widget instruction interface
interface WidgetInstruction {
  type: string
  instructions: string
  sourceDataModel: string | object
  hint?: string
}

// Widget configuration interface
interface WidgetConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FC<any>
  instruction: WidgetInstruction
  enabled: boolean
}

// Widget wrapper component with hover footer and remove button
interface WidgetWrapperProps {
  children?: React.ReactElement
  historyIndex?: number
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetType: string
}

const WidgetWrapper: FC<WidgetWrapperProps> = ({
  children,
  historyIndex,
  onWidgetCallback,
  widgetType
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWidgetCallback?.({
      type: 'widget:remove',
      messageIndex: historyIndex,
      widgetType: widgetType,
      timestamp: Date.now()
    })
  }

  const handleTryAgain = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWidgetCallback?.({
      type: 'widget:try_again',
      messageIndex: historyIndex,
      widgetType: widgetType,
      timestamp: Date.now()
    })
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children || null}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          gap: '4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s ease-in-out',
          pointerEvents: isHovered ? 'auto' : 'none',
          borderTopLeftRadius: '4px',
          zIndex: 10
        }}
      >
        <button
          onClick={handleTryAgain}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '2px',
            transition: 'background-color 0.15s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="Try again"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
        <button
          onClick={handleRemove}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '2px',
            transition: 'background-color 0.15s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Widget registry map
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  text: {
    component: TextWidget,
    instruction: TextWidgetInstruction,
    enabled: true
  },
  sample: {
    component: SampleWidget,
    instruction: SampleWidgetInstruction,
    enabled: true
  },
  image: {
    component: ImageWidget,
    instruction: ImageWidgetInstruction,
    enabled: true
  },
  google_map: {
    component: GoogleMapWidget,
    instruction: GoogleMapWidgetInstruction,
    enabled: true
  },
  confirm: {
    component: ConfirmWidget,
    instruction: ConfirmWidgetInstruction,
    enabled: true
  },
  select: {
    component: SelectWidget,
    instruction: SelectWidgetInstruction,
    enabled: true
  },
  image_grid: {
    component: ImageGridWidget,
    instruction: ImageGridWidgetInstruction,
    enabled: true
  },
  tabulator: {
    component: TabulatorWidget,
    instruction: TabulatorWidgetInstruction,
    enabled: true
  },
  input: {
    component: InputWidget,
    instruction: InputWidgetInstruction,
    enabled: true
  },
  chart: {
    component: ChartWidget,
    instruction: ChartWidgetInstruction,
    enabled: true
  },
  checklist: {
    component: CheckListWidget,
    instruction: CheckListWidgetInstruction,
    enabled: true
  },
  fullcalendar: {
    component: FullCalendarWidget,
    instruction: FullCalendarWidgetInstruction,
    enabled: true
  },
  video: {
    component: VideoWidget,
    instruction: VideoWidgetInstruction,
    enabled: true
  },
  mermaid: {
    component: MermaidWidget,
    instruction: MermaidWidgetInstruction,
    enabled: true
  }
}

// Generalized widget renderer function
export const renderWidget = (content: { type: string; source?: string; [key: string]: unknown }, onWidgetCallback?: (payload: Record<string, unknown>) => void, widgetsOptions?: Record<string, unknown>, historyIndex?: number) => {
  const widgetConfig = WIDGET_REGISTRY[content.type]
  
  if (!widgetConfig || !widgetConfig.enabled) {
    // Fallback to text widget if widget type is not found or disabled
    const textConfig = WIDGET_REGISTRY.text
    const fallbackKey = `widget-${historyIndex || 'unknown'}-text-fallback`
    const fallbackWidgetElement = React.createElement(textConfig.component, { 
      key: fallbackKey,
      source: content.source || JSON.stringify(content),
      onWidgetCallback,
      widgetsOptions,
      historyIndex
    })
    
    // Wrap the fallback widget with the footer wrapper
    return React.createElement(WidgetWrapper, {
      key: `wrapper-${fallbackKey}`,
      historyIndex,
      onWidgetCallback,
      widgetType: 'text'
    }, fallbackWidgetElement)
  }
  
  // Handle two cases:
  // 1. Standardized format: {type: "widget", source: "data"}
  // 2. Direct format: {type: "widget", lat: 45.0703, lon: 7.6869, zoom: 15} (entire object is source)
  const { type, source, ...otherContent } = content
  
  let widgetSource: string | object
  
  if (source !== undefined) {
    // Case 1: Standardized format with explicit source property
    widgetSource = source
  } else {
    // Case 2: Direct format - the entire object (minus type) is the source data
    widgetSource = otherContent
  }
  
  // Generate a stable key for the widget based on message index and widget type
  // This ensures React can properly identify and preserve widget instances during re-renders
  const widgetKey = `widget-${historyIndex || 'unknown'}-${type}`
  
  const props = {
    key: widgetKey,
    source: widgetSource,
    onWidgetCallback,
    widgetsOptions,
    historyIndex
  }
  
  const widgetElement = React.createElement(widgetConfig.component, props)
  
  // Wrap the widget with the footer wrapper (skip for text widget when it's a fallback)
  return React.createElement(WidgetWrapper, {
    key: `wrapper-${widgetKey}`,
    historyIndex,
    onWidgetCallback,
    widgetType: type
  }, widgetElement)
}

// Helper function to get widget types that should always be injected
const getAlwaysInjectedWidgetTypes = (widgetsOptions?: Record<string, unknown>): string[] => {
  const alwaysInjected: string[] = ['text'] // text widget is always included by default
  
  if (!widgetsOptions) {
    return alwaysInjected
  }
  
  // Check each widget configuration for injectAlways: true
  Object.entries(widgetsOptions).forEach(([widgetType, widgetOptions]) => {
    if (typeof widgetOptions === 'object' && widgetOptions !== null) {
      const options = widgetOptions as Record<string, unknown>
      if (options.injectAlways === true && WIDGET_REGISTRY[widgetType]?.enabled) {
        alwaysInjected.push(widgetType)
      }
    }
  })
  
  return [...new Set(alwaysInjected)] // Remove duplicates
}

// Get all enabled widget instructions based on widgetsOptions keys
export const getAllWidgetInstructions = (widgetsOptions?: Record<string, unknown>) => {
  // If no widgetsOptions provided or empty, only enable text widget
  if (!widgetsOptions || Object.keys(widgetsOptions).length === 0) {
    const textConfig = WIDGET_REGISTRY.text
    return [formatInstructionAsString(mergeWidgetInstruction(textConfig.instruction, widgetsOptions))]
  }
  
  // Get enabled widget types from widgetsOptions keys
  const enabledWidgetTypes = Object.keys(widgetsOptions)
  
  // Always include text widget and any widgets with injectAlways: true
  const alwaysInjectedTypes = getAlwaysInjectedWidgetTypes(widgetsOptions)
  const effectiveEnabledWidgets = [...new Set([...alwaysInjectedTypes, ...enabledWidgetTypes])]
  
  return Object.entries(WIDGET_REGISTRY)
    .filter(([widgetType, config]) => 
      config.enabled && effectiveEnabledWidgets.includes(widgetType)
    )
    .map(([, config]) => formatInstructionAsString(mergeWidgetInstruction(config.instruction, widgetsOptions)))
}

// Get widget instructions for specific widget types
export const getWidgetInstructionsForTypes = (
  widgetTypes: string[], 
  widgetsOptions?: Record<string, unknown>
) => {
  // Always include text widget and any widgets with injectAlways: true
  const alwaysInjectedTypes = getAlwaysInjectedWidgetTypes(widgetsOptions)
  const effectiveTypes = [...new Set([...alwaysInjectedTypes, ...widgetTypes])]
  
  return Object.entries(WIDGET_REGISTRY)
    .filter(([widgetType, config]) => 
      config.enabled && effectiveTypes.includes(widgetType)
    )
    .map(([, config]) => formatInstructionAsString(mergeWidgetInstruction(config.instruction, widgetsOptions)))
}

// Helper function to merge widget instruction with widgetsOptions overrides
const mergeWidgetInstruction = (baseInstruction: WidgetInstruction, widgetsOptions?: Record<string, unknown>): WidgetInstruction => {
  
  if (!widgetsOptions) {
    console.log('Debug mergeWidgetInstruction: no widgetsOptions, returning base')
    return baseInstruction
  }

  // Look for widget-specific options that might override instructions or sourceDataModel
  const widgetType = baseInstruction.type
  const widgetOptions = widgetsOptions[widgetType] as Record<string, unknown> | undefined

  console.log('Debug mergeWidgetInstruction: widgetOptions for', widgetType, '=', widgetOptions)

  if (!widgetOptions) {
    console.log('Debug mergeWidgetInstruction: no widgetOptions for', widgetType, ', returning base')
    return baseInstruction
  }

  // Create a merged instruction with overrides
  const mergedInstruction: WidgetInstruction = { ...baseInstruction }

  // Override instructions if provided in widgetsOptions
  if (widgetOptions.instructions && typeof widgetOptions.instructions === 'string') {
    console.log('Debug mergeWidgetInstruction: overriding instructions for', widgetType, 'with:', widgetOptions.instructions)
    mergedInstruction.instructions = widgetOptions.instructions
  }
  
  // Append additional instructions if provided in widgetsOptions
  if (widgetOptions.addInstruction && typeof widgetOptions.addInstruction === 'string') {
    console.log('Debug mergeWidgetInstruction: appending instructions for', widgetType, 'with:', widgetOptions.addInstruction)
    mergedInstruction.instructions = mergedInstruction.instructions + '\n' + widgetOptions.addInstruction
  }

  // Override sourceDataModel if provided in widgetsOptions
  if (widgetOptions.sourceDataModel !== undefined && widgetOptions.sourceDataModel !== null) {
    console.log('Debug mergeWidgetInstruction: overriding sourceDataModel for', widgetType, 'with:', widgetOptions.sourceDataModel)
    mergedInstruction.sourceDataModel = widgetOptions.sourceDataModel as string | object
  }

  console.log('Debug mergeWidgetInstruction: final merged instruction for', widgetType, '=', mergedInstruction)
  return mergedInstruction
}

// Helper function to format structured instruction back to string format
const formatInstructionAsString = (instruction: WidgetInstruction): string => {
  const sourceDataModelStr = typeof instruction.sourceDataModel === 'string' 
    ? instruction.sourceDataModel 
    : JSON.stringify(instruction.sourceDataModel, null, 2)
  
  return `- Format type: "${instruction.type}":
Why use this format type: ${instruction.instructions}
Source data type and model: ${sourceDataModelStr}`
}

// Helper function to enable/disable widgets
export const setWidgetEnabled = (widgetType: string, enabled: boolean) => {
  if (WIDGET_REGISTRY[widgetType]) {
    WIDGET_REGISTRY[widgetType].enabled = enabled
  }
}

// Helper function to get enabled widget types
export const getEnabledWidgetTypes = () => {
  return Object.keys(WIDGET_REGISTRY).filter(type => WIDGET_REGISTRY[type].enabled)
}

// Helper function to get structured widget instructions (for future use)
export const getStructuredWidgetInstructions = (widgetsOptions?: Record<string, unknown>): WidgetInstruction[] => {
  // If no widgetsOptions provided or empty, only enable text widget
  if (!widgetsOptions || Object.keys(widgetsOptions).length === 0) {
    const textConfig = WIDGET_REGISTRY.text
    return [mergeWidgetInstruction(textConfig.instruction, widgetsOptions)]
  }
  
  // Get enabled widget types from widgetsOptions keys
  const enabledWidgetTypes = Object.keys(widgetsOptions)
  
  // Always include text widget and any widgets with injectAlways: true
  const alwaysInjectedTypes = getAlwaysInjectedWidgetTypes(widgetsOptions)
  const effectiveEnabledWidgets = [...new Set([...alwaysInjectedTypes, ...enabledWidgetTypes])]
  
  return Object.entries(WIDGET_REGISTRY)
    .filter(([widgetType, config]) => 
      config.enabled && effectiveEnabledWidgets.includes(widgetType)
    )
    .map(([, config]) => mergeWidgetInstruction(config.instruction, widgetsOptions))
}

// Helper function to cleanup widget resources (for complex widgets that need cleanup)
export const cleanupWidgetResources = (widgetType: string, _widgetInstance?: unknown) => {
  // This function can be extended to handle specific cleanup for different widget types
  // For now, it's a placeholder for future widget-specific cleanup logic
  console.log(`WidgetRegistry: Cleanup requested for widget type: ${widgetType}`)
  
  // Example: If we had a global cleanup mechanism, we could implement it here
  // switch (widgetType) {
  //   case 'google_map':
  //     // Cleanup Google Maps resources
  //     break
  //   case 'tabulator':
  //     // Cleanup Tabulator resources
  //     break
  //   default:
  //     // No specific cleanup needed
  //     break
  // }
}
