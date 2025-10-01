import React from 'react'
import { type FC } from 'react'
import { TextWidget, TextWidgetInstruction } from './TextWidget'
import { SampleWidget, SampleWidgetInstruction } from './SampleWidget'
import { ImageWidget, ImageWidgetInstruction } from './ImageWidget'
import { GoogleMapWidget, GoogleMapWidgetInstruction } from './GoogleMapWidget'
import { ConfirmWidget, ConfirmWidgetInstruction } from './ConfirmWidget'
import { SelectorWidget, SelectorWidgetInstruction } from './SelectorWidget'
import { ImageGridWidget, ImageGridWidgetInstruction } from './ImageGridWidget'

// Widget instruction interface
interface WidgetInstruction {
  type: string
  instructions: string
  sourceDataModel: string | object
}

// Widget configuration interface
interface WidgetConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FC<any>
  instruction: WidgetInstruction
  enabled: boolean
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
  selector: {
    component: SelectorWidget,
    instruction: SelectorWidgetInstruction,
    enabled: true
  },
  image_grid: {
    component: ImageGridWidget,
    instruction: ImageGridWidgetInstruction,
    enabled: true
  }
}

// Generalized widget renderer function
export const renderWidget = (content: { type: string; source: string; [key: string]: unknown }, onWidgetCallback?: (payload: Record<string, unknown>) => void, widgetsOptions?: Record<string, unknown>) => {
  const widgetConfig = WIDGET_REGISTRY[content.type]
  
  if (!widgetConfig || !widgetConfig.enabled) {
    // Fallback to text widget if widget type is not found or disabled
    const textConfig = WIDGET_REGISTRY.text
    return React.createElement(textConfig.component, { 
      source: content.source,
      onWidgetCallback,
      widgetsOptions
    })
  }
  
  // Pass source and additional props directly to the widget
  // Each widget is responsible for parsing and using the source value appropriately
  const { source, ...otherContent } = content
  const props = {
    source,
    onWidgetCallback,
    widgetsOptions,
    ...otherContent // Spread all other properties from content (excluding source)
  }
  
  return React.createElement(widgetConfig.component, props)
}

// Get all enabled widget instructions based on provided enabled widgets
export const getAllWidgetInstructions = (enabledWidgets?: string[], widgetsOptions?: Record<string, unknown>) => {
  // If no enabled widgets specified, return all widgets
  if (!enabledWidgets) {
    return Object.values(WIDGET_REGISTRY)
      .filter(config => config.enabled)
      .map(config => formatInstructionAsString(mergeWidgetInstruction(config.instruction, widgetsOptions)))
  }
  
  // Always include text widget regardless of enabledWidgets array
  const effectiveEnabledWidgets = [...new Set(['text', ...enabledWidgets])]
  
  return Object.entries(WIDGET_REGISTRY)
    .filter(([widgetType, config]) => 
      config.enabled && effectiveEnabledWidgets.includes(widgetType)
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
export const getStructuredWidgetInstructions = (enabledWidgets?: string[], widgetsOptions?: Record<string, unknown>): WidgetInstruction[] => {
  // If no enabled widgets specified, return all widgets
  if (!enabledWidgets) {
    return Object.values(WIDGET_REGISTRY)
      .filter(config => config.enabled)
      .map(config => mergeWidgetInstruction(config.instruction, widgetsOptions))
  }
  
  // Always include text widget regardless of enabledWidgets array
  const effectiveEnabledWidgets = [...new Set(['text', ...enabledWidgets])]
  
  return Object.entries(WIDGET_REGISTRY)
    .filter(([widgetType, config]) => 
      config.enabled && effectiveEnabledWidgets.includes(widgetType)
    )
    .map(([, config]) => mergeWidgetInstruction(config.instruction, widgetsOptions))
}
