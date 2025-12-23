/**
 * Plugin Loader - Types and utilities for the widget plugin system
 * 
 * This module provides the core types and utilities for discovering,
 * loading, and integrating widget plugins at build time.
 */

import { type FC } from 'react'

// ============================================================================
// Widget Instruction Types
// ============================================================================

/**
 * Defines the AI instruction for a widget - tells the AI when and how to use it
 */
export interface WidgetInstruction {
  /** Unique widget type identifier (e.g., 'google_map', 'chart') */
  type: string
  /** Instructions for AI on when to use this widget */
  instructions: string
  /** Data model specification - can be a description string or structured object */
  sourceDataModel: string | Record<string, unknown>
  /** Optional hint for the AI */
  hint?: string
}

// ============================================================================
// Widget Component Types
// ============================================================================

/**
 * Standard props that all widgets receive
 */
export interface WidgetProps {
  /** Main data input - can be string, object, or array */
  source: string | Record<string, unknown> | Array<unknown>
  /** Callback for widget interactions */
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  /** Global widget configuration options */
  widgetsOptions?: Record<string, unknown>
  /** Index in message history (for memoization) */
  historyIndex?: number
}

/**
 * Widget component type - all widgets must implement this interface
 */
export type WidgetComponent = FC<WidgetProps>

// ============================================================================
// Plugin Manifest Types
// ============================================================================

/**
 * Asset configuration for a widget plugin
 */
export interface PluginAssets {
  /** CSS URLs to inject (CDN links or relative paths) */
  css?: string[]
  /** Font URLs to preload */
  fonts?: string[]
  /** Whether to inject assets into shadow DOM (for isolation) */
  shadowDom?: boolean
}

/**
 * Dependency configuration for a widget plugin
 */
export interface PluginDependencies {
  /** Runtime dependencies that must be bundled */
  runtime?: string[]
  /** Peer dependencies (assumed to be available) */
  peer?: string[]
}

/**
 * Widget plugin manifest - the main configuration file for a widget plugin
 * This is defined in widget.manifest.json in each plugin package
 */
export interface WidgetPluginManifest {
  /** Widget type identifier (must match instruction.type) */
  name: string
  /** Semantic version */
  version: string
  /** Human-readable display name */
  displayName: string
  /** Path to the widget component relative to package root */
  component: string
  /** AI instruction configuration */
  instruction: WidgetInstruction
  /** Dependencies configuration */
  dependencies?: PluginDependencies
  /** Assets to inject (CSS, fonts) */
  assets?: PluginAssets
  /** Whether this widget is enabled by default */
  enabledByDefault?: boolean
  /** Widget category for organization */
  category?: 'core' | 'visualization' | 'input' | 'media' | 'layout' | 'custom'
  /** Additional metadata */
  meta?: Record<string, unknown>
}

// ============================================================================
// Plugin Configuration Types
// ============================================================================

/**
 * Configuration for which plugins to include in the build
 * Defined in retool-widget-plugins.json
 */
export interface PluginConfiguration {
  /** List of plugin package names to include */
  plugins: string[]
  /** Core widgets to exclude from the build */
  excludeCore?: string[]
  /** Global assets to always include */
  globalAssets?: {
    css?: string[]
    fonts?: string[]
  }
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Internal widget configuration used by the registry
 */
export interface WidgetConfig {
  /** React component for the widget */
  component: WidgetComponent
  /** AI instruction for the widget */
  instruction: WidgetInstruction
  /** Whether the widget is currently enabled */
  enabled: boolean
  /** Source package (for plugins) */
  packageName?: string
  /** Assets required by this widget */
  assets?: PluginAssets
}

/**
 * The widget registry type - maps widget types to their configurations
 */
export type WidgetRegistry = Record<string, WidgetConfig>

// ============================================================================
// Build-time Types
// ============================================================================

/**
 * Resolved plugin information after scanning node_modules
 */
export interface ResolvedPlugin {
  /** Package name */
  packageName: string
  /** Absolute path to the package */
  packagePath: string
  /** Parsed manifest */
  manifest: WidgetPluginManifest
  /** Resolved component path (absolute) */
  componentPath: string
}

/**
 * Generated registry entry for code generation
 */
export interface GeneratedRegistryEntry {
  /** Widget type */
  type: string
  /** Import path for the component */
  importPath: string
  /** Import path for the instruction */
  instructionImportPath?: string
  /** Inline instruction (if not imported) */
  instruction: WidgetInstruction
  /** CSS assets to inject */
  cssAssets?: string[]
  /** Font assets to preload */
  fontAssets?: string[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates a widget plugin manifest
 */
export function validateManifest(manifest: unknown): manifest is WidgetPluginManifest {
  if (!manifest || typeof manifest !== 'object') {
    return false
  }
  
  const m = manifest as Record<string, unknown>
  
  // Required fields
  if (typeof m.name !== 'string' || !m.name) return false
  if (typeof m.version !== 'string' || !m.version) return false
  if (typeof m.displayName !== 'string' || !m.displayName) return false
  if (typeof m.component !== 'string' || !m.component) return false
  
  // Validate instruction
  if (!m.instruction || typeof m.instruction !== 'object') return false
  const instruction = m.instruction as Record<string, unknown>
  if (typeof instruction.type !== 'string' || !instruction.type) return false
  if (typeof instruction.instructions !== 'string') return false
  if (instruction.sourceDataModel === undefined) return false
  
  return true
}

/**
 * Creates a default manifest for a widget
 */
export function createDefaultManifest(
  name: string,
  displayName: string,
  instructions: string,
  sourceDataModel: string | Record<string, unknown> = 'string'
): WidgetPluginManifest {
  return {
    name,
    version: '1.0.0',
    displayName,
    component: `./src/${name.charAt(0).toUpperCase() + name.slice(1)}Widget.tsx`,
    instruction: {
      type: name,
      instructions,
      sourceDataModel
    },
    enabledByDefault: true,
    category: 'custom'
  }
}

/**
 * Merges widget instruction with runtime options overrides
 */
export function mergeInstructionWithOptions(
  baseInstruction: WidgetInstruction,
  widgetsOptions?: Record<string, unknown>
): WidgetInstruction {
  if (!widgetsOptions) {
    return baseInstruction
  }
  
  const widgetOptions = widgetsOptions[baseInstruction.type] as Record<string, unknown> | undefined
  
  if (!widgetOptions) {
    return baseInstruction
  }
  
  const merged: WidgetInstruction = { ...baseInstruction }
  
  // Override instructions if provided
  if (typeof widgetOptions.instructions === 'string') {
    merged.instructions = widgetOptions.instructions
  }
  
  // Append additional instructions if provided
  if (typeof widgetOptions.addInstruction === 'string') {
    merged.instructions = merged.instructions + '\n' + widgetOptions.addInstruction
  }
  
  // Override sourceDataModel if provided
  if (widgetOptions.sourceDataModel !== undefined && widgetOptions.sourceDataModel !== null) {
    merged.sourceDataModel = widgetOptions.sourceDataModel as string | Record<string, unknown>
  }
  
  return merged
}

/**
 * Formats a widget instruction as a string for AI prompts
 */
export function formatInstructionAsString(instruction: WidgetInstruction): string {
  const sourceDataModelStr = typeof instruction.sourceDataModel === 'string'
    ? instruction.sourceDataModel
    : JSON.stringify(instruction.sourceDataModel, null, 2)
  
  return `- Format type: "${instruction.type}":
Why use this format type: ${instruction.instructions}
Source data type and model: ${sourceDataModelStr}`
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Core widgets that are always included (cannot be removed via plugins)
 */
export const CORE_WIDGETS = ['text'] as const

/**
 * Default plugin package prefix
 */
export const PLUGIN_PACKAGE_PREFIX = '@retool-ai-chat-plus/widget-'

/**
 * Manifest filename
 */
export const MANIFEST_FILENAME = 'widget.manifest.json'

