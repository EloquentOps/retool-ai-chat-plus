import React from 'react'
import { type FC } from 'react'
import { TextWidget, TextWidgetInstruction } from './TextWidget'
import { ColorWidget, ColorWidgetInstruction } from './ColorWidget'
import { ImageWidget, ImageWidgetInstruction } from './ImageWidget'

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
  }
}

// Generalized widget renderer function
export const renderWidget = (content: { type: string; source: string; [key: string]: unknown }) => {
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
    default:
      props.content = content.source
  }
  
  return React.createElement(widgetConfig.component, props)
}

// Get all enabled widget instructions
export const getAllWidgetInstructions = () => {
  return Object.values(WIDGET_REGISTRY)
    .filter(config => config.enabled)
    .map(config => config.instruction)
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
