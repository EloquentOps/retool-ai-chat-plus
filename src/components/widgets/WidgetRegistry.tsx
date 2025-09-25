import React from 'react'
import { type FC } from 'react'
import { TextWidget, TextWidgetInstruction } from './TextWidget'
import { ColorWidget, ColorWidgetInstruction } from './ColorWidget'
import { ImageWidget, ImageWidgetInstruction } from './ImageWidget'
import { GMapWidget, GMapWidgetInstruction } from './GMapWidget'
import { ConfirmWidget, ConfirmWidgetInstruction } from './ConfirmWidget'

// Widget configuration interface
interface WidgetConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FC<any>
  instruction: string
  enabled: boolean
}

// Widget registry map
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  text: {
    component: TextWidget,
    instruction: TextWidgetInstruction,
    enabled: true
  },
  color: {
    component: ColorWidget,
    instruction: ColorWidgetInstruction,
    enabled: true
  },
  image: {
    component: ImageWidget,
    instruction: ImageWidgetInstruction,
    enabled: true
  },
  map: {
    component: GMapWidget,
    instruction: GMapWidgetInstruction,
    enabled: true
  },
  confirm: {
    component: ConfirmWidget,
    instruction: ConfirmWidgetInstruction,
    enabled: true
  }
}

// Generalized widget renderer function
export const renderWidget = (content: { type: string; source: string; [key: string]: unknown }, onWidgetCallback?: (payload: Record<string, unknown>) => void) => {
  const widgetConfig = WIDGET_REGISTRY[content.type]
  
  if (!widgetConfig || !widgetConfig.enabled) {
    // Fallback to text widget if widget type is not found or disabled
    const textConfig = WIDGET_REGISTRY.text
    return React.createElement(textConfig.component, { content: content.source })
  }
  
  // Create props based on widget type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}
  
  switch (content.type) {
    case 'text':
      props.content = content.source
      break
    case 'color':
      props.color = content.source
      props.width = content.width as number
      props.height = content.height as number
      break
    case 'image':
      props.src = content.source
      props.alt = content.alt as string
      props.width = content.width as number
      props.height = content.height as number
      break
    case 'map':
      props.location = content.source
      props.width = content.width as number
      props.height = content.height as number
      props.zoom = content.zoom as number
      props.apiKey = content.apiKey as string
      break
    case 'confirm':
      props.text = content.source
      props.variant = content.variant as string
      props.size = content.size as string
      props.disabled = content.disabled as boolean
      props.onConfirm = () => {
        if (onWidgetCallback) {
          onWidgetCallback({})
        }
      }
      break
    default:
      props.content = content.source
  }
  
  return React.createElement(widgetConfig.component, props)
}

// Get all enabled widget instructions based on provided enabled widgets
export const getAllWidgetInstructions = (enabledWidgets?: string[]) => {
  // If no enabled widgets specified, return all widgets
  if (!enabledWidgets) {
    return Object.values(WIDGET_REGISTRY)
      .filter(config => config.enabled)
      .map(config => config.instruction)
  }
  
  // Always include text widget regardless of enabledWidgets array
  const effectiveEnabledWidgets = [...new Set(['text', ...enabledWidgets])]
  
  return Object.entries(WIDGET_REGISTRY)
    .filter(([widgetType, config]) => 
      config.enabled && effectiveEnabledWidgets.includes(widgetType)
    )
    .map(([, config]) => config.instruction)
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
