import React, { useState } from 'react'
import { type FC } from 'react'

// ============================================================================
// Core Widget Imports (only essential widgets that must always be available)
// ============================================================================
import { TextWidget, TextWidgetInstruction } from './TextWidget'

// ============================================================================
// Types
// ============================================================================

// Widget instruction interface
export interface WidgetInstruction {
  type: string
  instructions: string
  sourceDataModel: string | object
  hint?: string
}

// Widget configuration interface
export interface WidgetConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FC<any>
  instruction: WidgetInstruction
  enabled: boolean
  /** Source of the widget: 'core' for built-in, 'external' for internal but extractable, 'plugin' for npm packages */
  source?: 'core' | 'external' | 'plugin'
  /** Package name for plugin widgets */
  packageName?: string
}

// Widget registry type
export type WidgetRegistryType = Record<string, WidgetConfig>

// ============================================================================
// Widget Wrapper Component
// ============================================================================

interface WidgetWrapperProps {
  children?: React.ReactElement
  messageIndex?: number
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetType: string
  widgetContent?: { type: string; source?: string; [key: string]: unknown }
  lockUI?: boolean
  hideWidgetFooter?: boolean
}

const WidgetWrapper: FC<WidgetWrapperProps> = ({
  children,
  messageIndex,
  onWidgetCallback,
  widgetType,
  widgetContent,
  lockUI = false,
  hideWidgetFooter = false
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWidgetCallback?.({
      type: 'widget:remove',
      messageIndex: messageIndex,
      widgetType: widgetType,
      timestamp: Date.now()
    })
  }

  const handleTryAgain = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWidgetCallback?.({
      type: 'widget:try_again',
      messageIndex: messageIndex,
      widgetType: widgetType,
      timestamp: Date.now()
    })
  }

  const isPinned = widgetContent?.pinned === true

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (widgetContent) {
      if (isPinned) {
        // Unpin if already pinned
        onWidgetCallback?.({
          type: 'widget:unpin',
          historyIndex: messageIndex,
          timestamp: Date.now()
        })
      } else {
        // Pin if not pinned
        onWidgetCallback?.({
          type: 'widget:pin',
          widgetContent: widgetContent,
          widgetType: widgetType,
          messageIndex: messageIndex,
          timestamp: Date.now()
        })
      }
    }
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
      {!lockUI && !hideWidgetFooter && (
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
            onClick={handlePin}
            disabled={lockUI}
            style={{
              background: isPinned ? 'rgba(0, 123, 255, 0.3)' : 'transparent',
              border: 'none',
              color: isPinned ? '#fff' : '#fff',
              cursor: lockUI ? 'not-allowed' : 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              transition: 'background-color 0.15s ease-in-out',
              opacity: lockUI ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!lockUI) {
                e.currentTarget.style.backgroundColor = isPinned ? 'rgba(0, 123, 255, 0.5)' : 'rgba(255, 255, 255, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!lockUI) {
                e.currentTarget.style.backgroundColor = isPinned ? 'rgba(0, 123, 255, 0.3)' : 'transparent'
              }
            }}
            title={lockUI ? "Locked" : (isPinned ? "Unpin from right panel" : "Pin to right panel")}
          >
          {isPinned ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14l-1-7H6l-1 7z" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14l-1-7H6l-1 7z" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" />
            </svg>
          )}
          </button>
          <button
            onClick={handleTryAgain}
            disabled={lockUI}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: lockUI ? 'not-allowed' : 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              transition: 'background-color 0.15s ease-in-out',
              opacity: lockUI ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!lockUI) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!lockUI) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            title={lockUI ? "Locked" : "Try again"}
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
            disabled={lockUI}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: lockUI ? 'not-allowed' : 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              transition: 'background-color 0.15s ease-in-out',
              opacity: lockUI ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!lockUI) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!lockUI) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            title={lockUI ? "Locked" : "Delete"}
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
      )}
    </div>
  )
}

// ============================================================================
// Core Widget Registry (minimal - only essential widgets)
// ============================================================================

/**
 * Core widgets that are always bundled and cannot be removed.
 * These are essential for the chat system to function.
 */
const CORE_WIDGET_REGISTRY: WidgetRegistryType = {
  text: {
    component: TextWidget,
    instruction: TextWidgetInstruction,
    enabled: true,
    source: 'core'
  }
}

// ============================================================================
// External & Plugin Integration
// ============================================================================

/**
 * Registry for external widgets (from ./external/) and npm plugins.
 * These are loaded from the generated file at runtime.
 */
const GENERATED_REGISTRY: WidgetRegistryType = (() => {
  const registry: WidgetRegistryType = {}
  try {
    // This file is generated by build-plugins.ts
    // It includes both external widgets (./external/) and npm plugins
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const generated = require('./WidgetRegistry.generated')
    if (generated.GENERATED_WIDGET_REGISTRY) {
      // Add all generated widgets except those already in core
      Object.entries(generated.GENERATED_WIDGET_REGISTRY).forEach(([key, value]) => {
        if (!CORE_WIDGET_REGISTRY[key]) {
          registry[key] = value as WidgetConfig
        }
      })
      console.log('WidgetRegistry: Loaded', Object.keys(registry).length, 'external/plugin widgets')
    }
  } catch {
    // No generated registry yet - this is fine during initial setup
    console.debug('WidgetRegistry: No generated plugin registry found (run npm run build:plugins)')
  }
  return registry
})()

// ============================================================================
// Merged Widget Registry (exported)
// ============================================================================

/**
 * Combined widget registry containing core, external, and plugin widgets.
 * Priority: Core > Generated (external + plugins)
 */
export const WIDGET_REGISTRY: WidgetRegistryType = {
  ...GENERATED_REGISTRY,  // External and plugins (lower priority)
  ...CORE_WIDGET_REGISTRY // Core widgets override everything
}

// ============================================================================
// Plugin Registration API
// ============================================================================

/**
 * Register a new widget at runtime.
 * Useful for dynamically adding widgets without rebuilding.
 * 
 * @param widgetType - Unique identifier for the widget
 * @param config - Widget configuration
 * @returns boolean - Whether registration was successful
 */
export const registerWidget = (
  widgetType: string,
  config: WidgetConfig
): boolean => {
  if (WIDGET_REGISTRY[widgetType]) {
    console.warn(`WidgetRegistry: Widget '${widgetType}' already exists, skipping registration`)
    return false
  }
  
  WIDGET_REGISTRY[widgetType] = {
    ...config,
    source: config.source || 'plugin'
  }
  
  console.log(`WidgetRegistry: Registered widget '${widgetType}'`)
  return true
}

/**
 * Unregister a widget.
 * Note: Core widgets cannot be unregistered.
 * 
 * @param widgetType - Widget identifier to remove
 * @returns boolean - Whether unregistration was successful
 */
export const unregisterWidget = (widgetType: string): boolean => {
  const config = WIDGET_REGISTRY[widgetType]
  
  if (!config) {
    console.warn(`WidgetRegistry: Widget '${widgetType}' not found`)
    return false
  }
  
  if (config.source === 'core') {
    console.warn(`WidgetRegistry: Cannot unregister core widget '${widgetType}'`)
    return false
  }
  
  delete WIDGET_REGISTRY[widgetType]
  console.log(`WidgetRegistry: Unregistered widget '${widgetType}'`)
  return true
}

/**
 * Get registry metadata for debugging/inspection
 */
export const getRegistryMetadata = () => {
  const core = Object.entries(WIDGET_REGISTRY)
    .filter(([, config]) => config.source === 'core')
    .map(([key]) => key)
  
  const external = Object.entries(WIDGET_REGISTRY)
    .filter(([, config]) => config.source === 'external')
    .map(([key]) => key)
  
  const plugins = Object.entries(WIDGET_REGISTRY)
    .filter(([, config]) => config.source === 'plugin')
    .map(([key, config]) => ({ type: key, package: config.packageName }))
  
  return {
    totalWidgets: Object.keys(WIDGET_REGISTRY).length,
    coreWidgets: core,
    externalWidgets: external,
    pluginWidgets: plugins
  }
}

// ============================================================================
// Widget Renderer
// ============================================================================

/**
 * Generalized widget renderer function.
 * Renders the appropriate widget component based on content type.
 */
export const renderWidget = (
  content: { type: string; source?: string; [key: string]: unknown },
  onWidgetCallback?: (payload: Record<string, unknown>) => void,
  widgetsOptions?: Record<string, unknown>,
  blockId?: number,
  blockIndex?: number,
  messageIndex?: number,
  lockUI?: boolean,
  hideWidgetFooter?: boolean
) => {
  const widgetConfig = WIDGET_REGISTRY[content.type]
  
  if (!widgetConfig || !widgetConfig.enabled) {
    // Fallback to text widget if widget type is not found or disabled
    const textConfig = WIDGET_REGISTRY.text
    const fallbackKey = `widget-${blockId ?? 'unknown'}-${blockIndex ?? 'unknown'}-text-fallback`
    const fallbackWidgetElement = React.createElement(textConfig.component, { 
      key: fallbackKey,
      source: content.source || JSON.stringify(content),
      onWidgetCallback,
      widgetsOptions,
      historyIndex: undefined
    })
    
    // Prepare widget content object for pinning (preserving pinned property)
    const fallbackWidgetContent: { type: string; source?: string; [key: string]: unknown } = {
      type: 'text',
      source: content.source || JSON.stringify(content),
      ...(content.pinned !== undefined ? { pinned: content.pinned } : {})
    }
    
    // Wrap the fallback widget with the footer wrapper
    return React.createElement(WidgetWrapper, {
      key: `wrapper-${fallbackKey}`,
      messageIndex: messageIndex,
      onWidgetCallback,
      widgetType: 'text',
      widgetContent: fallbackWidgetContent,
      lockUI: lockUI,
      hideWidgetFooter: hideWidgetFooter
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
  
  // Generate a stable key for the widget based on blockId/blockIndex and widget type
  // This ensures React can properly identify and preserve widget instances during re-renders
  const widgetKey = `widget-${blockId ?? 'unknown'}-${blockIndex ?? 'unknown'}-${type}`
  
  // Prepare widget content object for pinning (reconstruct the original content structure, preserving pinned property)
  const widgetContentForPin: { type: string; source?: string; [key: string]: unknown } = {
    type: type,
    ...(source !== undefined ? { source: source } : {}),
    ...(source === undefined ? otherContent : {}),
    ...(content.pinned !== undefined ? { pinned: content.pinned } : {})
  }
  
  // Map widget type -> source key for updatedSource (history updates)
  const SOURCE_KEYS: Record<string, string> = {
    input: 'currentValue',
    select: 'selectedValue',
    slider: 'initialValue'
  }
  
  const wrappedCallback = (payload: Record<string, unknown>) => {
    const { type: payloadType, value } = payload
    const widgetTag = typeof payloadType === 'string' ? payloadType.split(':')[0] : undefined
    const sourceKey = widgetTag && SOURCE_KEYS[widgetTag]
    let enriched = { ...payload }
    // Use blockId + blockIndex for reliable message identification
    if (typeof blockId === 'number' && typeof blockIndex === 'number') {
      if (sourceKey) {
        enriched = {
          ...payload,
          updateHistory: true,
          blockId,
          blockIndex,
          updatedSource: { [sourceKey]: value }
        }
      } else if (widgetTag === 'google_map' && value != null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value
          enriched = {
            ...payload,
            updateHistory: true,
            blockId,
            blockIndex,
            updatedSource: parsed as Record<string, unknown>
          }
        } catch {
          // ignore parse error
        }
      }
    }
    if (payloadType === 'input:changed') {
      enriched = { ...enriched, dispatchEvent: true }
    }
    if (payloadType === 'input:submitted') {
      enriched = { ...enriched, selfSubmit: true, prompt: value, dispatchEvent: true }
    }
    // All widgets that trigger history updates should also fire the Retool event
    if (sourceKey || widgetTag === 'google_map') {
      enriched = { ...enriched, dispatchEvent: true }
    }
    onWidgetCallback?.(enriched)
  }
  
  const props = {
    key: widgetKey,
    source: widgetSource,
    onWidgetCallback: onWidgetCallback ? wrappedCallback : undefined,
    widgetsOptions,
    historyIndex: undefined
  }
  
  const widgetElement = React.createElement(widgetConfig.component, props)
  
  // Wrap the widget with the footer wrapper (skip for text widget when it's a fallback)
  return React.createElement(WidgetWrapper, {
    key: `wrapper-${widgetKey}`,
    messageIndex: messageIndex,
    onWidgetCallback,
    widgetType: type,
    widgetContent: widgetContentForPin,
    lockUI: lockUI,
    hideWidgetFooter: hideWidgetFooter
  }, widgetElement)
}

// ============================================================================
// Instruction Helpers
// ============================================================================

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
    return baseInstruction
  }

  // Look for widget-specific options that might override instructions or sourceDataModel
  const widgetType = baseInstruction.type
  const widgetOptions = widgetsOptions[widgetType] as Record<string, unknown> | undefined

  if (!widgetOptions) {
    return baseInstruction
  }

  // Create a merged instruction with overrides
  const mergedInstruction: WidgetInstruction = { ...baseInstruction }

  // Override instructions if provided in widgetsOptions
  if (widgetOptions.instructions && typeof widgetOptions.instructions === 'string') {
    mergedInstruction.instructions = widgetOptions.instructions
  }
  
  // Append additional instructions if provided in widgetsOptions
  if (widgetOptions.addInstruction && typeof widgetOptions.addInstruction === 'string') {
    mergedInstruction.instructions = mergedInstruction.instructions + '\n' + widgetOptions.addInstruction
  }

  // Override sourceDataModel if provided in widgetsOptions
  if (widgetOptions.sourceDataModel !== undefined && widgetOptions.sourceDataModel !== null) {
    mergedInstruction.sourceDataModel = widgetOptions.sourceDataModel as string | object
  }

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

// ============================================================================
// Widget State Management
// ============================================================================

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
}
