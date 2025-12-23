#!/usr/bin/env node
/**
 * Build Plugins Script
 * 
 * This CLI tool discovers widgets and plugins and generates:
 * 1. WidgetRegistry.generated.tsx - Dynamic widget registry with all widgets
 * 2. GlobalAssets.generated.tsx - CSS and font imports for all widgets
 * 
 * Widget Sources:
 * - Core: src/components/widgets/*.tsx (e.g., TextWidget)
 * - External: src/components/widgets/external/*.tsx (internal but extractable)
 * - Plugins: node_modules/@retool-ai-chat-plus/widget-* (npm packages)
 * 
 * Usage:
 *   npx ts-node scripts/build-plugins.ts
 *   npm run build:plugins
 */

const fs = require('fs')
const path = require('path')

// ============================================================================
// Types
// ============================================================================

interface WidgetInstruction {
  type: string
  instructions: string
  sourceDataModel: string | Record<string, unknown>
  hint?: string
}

interface PluginAssets {
  css?: string[]
  fonts?: string[]
}

interface WidgetPluginManifest {
  name: string
  version: string
  displayName: string
  component: string
  instruction: WidgetInstruction
  dependencies?: {
    runtime?: string[]
    peer?: string[]
  }
  assets?: PluginAssets
  enabledByDefault?: boolean
  category?: string
}

interface PluginConfiguration {
  /** NPM plugin packages to include */
  plugins: string[]
  /** External widgets to include (by widget name, e.g., "chart", "google_map") */
  external?: string[]
  /** If true, include all external widgets found (ignores external array) */
  externalAll?: boolean
  /** Global CSS and font assets */
  globalAssets?: {
    css?: string[]
    fonts?: string[]
  }
}

interface ResolvedPlugin {
  packageName: string
  packagePath: string
  manifest: WidgetPluginManifest
  componentPath: string
}

interface DiscoveredWidget {
  name: string
  componentFile: string
  componentName: string
  instructionName: string
  importPath: string
  source: 'core' | 'external' | 'plugin'
  packageName?: string
}

// ============================================================================
// Constants
// ============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..')
const NODE_MODULES = path.join(PROJECT_ROOT, 'node_modules')
const SRC_DIR = path.join(PROJECT_ROOT, 'src')
const WIDGETS_DIR = path.join(SRC_DIR, 'components', 'widgets')
const EXTERNAL_WIDGETS_DIR = path.join(WIDGETS_DIR, 'external')
const CONFIG_FILE = path.join(PROJECT_ROOT, 'retool-widget-plugins.json')
const MANIFEST_FILENAME = 'widget.manifest.json'

// Output files
const GENERATED_REGISTRY = path.join(WIDGETS_DIR, 'WidgetRegistry.generated.tsx')
const GENERATED_ASSETS = path.join(WIDGETS_DIR, 'GlobalAssets.generated.tsx')

// Known widget name mappings (file basename -> registry key)
// This handles cases where the naming convention is inconsistent
const WIDGET_NAME_OVERRIDES: Record<string, string> = {
  'CheckList': 'checklist',
  'FullCalendar': 'fullcalendar',
  'MDX': 'mdx',
  'GoogleMap': 'google_map',
  'ImageGrid': 'image_grid'
}

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = {
    info: '📦',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }
  console.log(`${icons[type]} ${message}`)
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

function getWidgetNameFromFile(baseName: string): string {
  if (WIDGET_NAME_OVERRIDES[baseName]) {
    return WIDGET_NAME_OVERRIDES[baseName]
  }
  return baseName.toLowerCase()
}

function validateManifest(manifest: unknown): manifest is WidgetPluginManifest {
  if (!manifest || typeof manifest !== 'object') return false
  
  const m = manifest as Record<string, unknown>
  
  if (typeof m.name !== 'string' || !m.name) return false
  if (typeof m.version !== 'string' || !m.version) return false
  if (typeof m.displayName !== 'string' || !m.displayName) return false
  if (typeof m.component !== 'string' || !m.component) return false
  
  if (!m.instruction || typeof m.instruction !== 'object') return false
  const instruction = m.instruction as Record<string, unknown>
  if (typeof instruction.type !== 'string' || !instruction.type) return false
  if (typeof instruction.instructions !== 'string') return false
  
  return true
}

// ============================================================================
// Plugin Configuration
// ============================================================================

function loadPluginConfig(): PluginConfiguration {
  const config = readJsonFile<PluginConfiguration>(CONFIG_FILE)
  
  if (!config) {
    log('No retool-widget-plugins.json found, using defaults', 'warn')
    return {
      plugins: [],
      external: [],
      externalAll: false,
      globalAssets: {
        css: [],
        fonts: []
      }
    }
  }
  
  return config
}

// ============================================================================
// Widget Discovery
// ============================================================================

function discoverAllWidgetsInFolder(folder: string): Map<string, { file: string; baseName: string }> {
  const widgetMap = new Map<string, { file: string; baseName: string }>()
  
  if (!fs.existsSync(folder)) {
    return widgetMap
  }
  
  const files = fs.readdirSync(folder)
  
  for (const file of files) {
    // Skip non-widget files
    if (!file.endsWith('Widget.tsx')) continue
    if (file === 'WidgetRegistry.tsx') continue
    if (file.includes('.generated.')) continue
    
    const baseName = file.replace('Widget.tsx', '')
    const widgetName = getWidgetNameFromFile(baseName)
    
    widgetMap.set(widgetName, { file, baseName })
  }
  
  return widgetMap
}

function createWidgetFromFile(
  widgetName: string,
  file: string,
  baseName: string,
  source: 'core' | 'external',
  importPrefix: string
): DiscoveredWidget {
  const componentName = `${baseName}Widget`
  const instructionName = `${componentName}Instruction`
  
  return {
    name: widgetName,
    componentFile: file,
    componentName,
    instructionName,
    importPath: `${importPrefix}${baseName}Widget`,
    source
  }
}

function discoverCoreWidgets(): DiscoveredWidget[] {
  // Core widgets are always all included (only TextWidget should be in core)
  const widgetMap = discoverAllWidgetsInFolder(WIDGETS_DIR)
  const widgets: DiscoveredWidget[] = []
  
  for (const [widgetName, { file, baseName }] of widgetMap) {
    widgets.push(createWidgetFromFile(widgetName, file, baseName, 'core', './'))
  }
  
  return widgets
}

function discoverExternalWidgets(includeList?: string[], includeAll?: boolean): DiscoveredWidget[] {
  const widgetMap = discoverAllWidgetsInFolder(EXTERNAL_WIDGETS_DIR)
  const widgets: DiscoveredWidget[] = []
  
  // If includeAll is true, include everything
  if (includeAll) {
    for (const [widgetName, { file, baseName }] of widgetMap) {
      widgets.push(createWidgetFromFile(widgetName, file, baseName, 'external', './external/'))
      log(`Including external widget: ${widgetName}`, 'info')
    }
    return widgets
  }
  
  // If no include list, return empty (explicit opt-in)
  if (!includeList || includeList.length === 0) {
    log('No external widgets configured in "external" array', 'info')
    return widgets
  }
  
  // Include only widgets in the list
  for (const widgetName of includeList) {
    const widgetInfo = widgetMap.get(widgetName)
    if (widgetInfo) {
      widgets.push(createWidgetFromFile(widgetName, widgetInfo.file, widgetInfo.baseName, 'external', './external/'))
      log(`Including external widget: ${widgetName}`, 'info')
    } else {
      log(`External widget not found: ${widgetName}`, 'warn')
    }
  }
  
  return widgets
}

// ============================================================================
// NPM Plugin Discovery
// ============================================================================

function discoverNpmPlugin(packageName: string): ResolvedPlugin | null {
  const possiblePaths = [
    path.join(NODE_MODULES, packageName),
    path.join(NODE_MODULES, '@retool-ai-chat-plus', packageName.replace('@retool-ai-chat-plus/', ''))
  ]
  
  for (const packagePath of possiblePaths) {
    if (!fs.existsSync(packagePath)) continue
    
    const manifestPath = path.join(packagePath, MANIFEST_FILENAME)
    if (!fs.existsSync(manifestPath)) {
      log(`Package ${packageName} found but missing ${MANIFEST_FILENAME}`, 'warn')
      continue
    }
    
    const manifest = readJsonFile<WidgetPluginManifest>(manifestPath)
    if (!manifest || !validateManifest(manifest)) {
      log(`Invalid manifest in ${packageName}`, 'warn')
      continue
    }
    
    const componentPath = path.resolve(packagePath, manifest.component)
    if (!fs.existsSync(componentPath) && !fs.existsSync(componentPath + '.tsx') && !fs.existsSync(componentPath + '.ts')) {
      log(`Component not found for ${packageName}: ${manifest.component}`, 'warn')
      continue
    }
    
    return {
      packageName,
      packagePath,
      manifest,
      componentPath: manifest.component
    }
  }
  
  return null
}

function discoverAllNpmPlugins(packageNames: string[]): DiscoveredWidget[] {
  const widgets: DiscoveredWidget[] = []
  
  for (const packageName of packageNames) {
    const plugin = discoverNpmPlugin(packageName)
    if (plugin) {
      const { manifest } = plugin
      const componentName = manifest.name.split('_').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Widget'
      
      widgets.push({
        name: manifest.name,
        componentFile: manifest.component,
        componentName,
        instructionName: `${componentName}Instruction`,
        importPath: packageName,
        source: 'plugin',
        packageName
      })
      
      log(`Discovered npm plugin: ${manifest.displayName} (${manifest.name})`, 'success')
    } else {
      log(`Plugin not found: ${packageName}`, 'error')
    }
  }
  
  return widgets
}

// ============================================================================
// Code Generation
// ============================================================================

function generateRegistryCode(widgets: DiscoveredWidget[], config: PluginConfiguration): string {
  const coreWidgets = widgets.filter(w => w.source === 'core')
  const externalWidgets = widgets.filter(w => w.source === 'external')
  const pluginWidgets = widgets.filter(w => w.source === 'plugin')
  
  // Generate imports
  const coreImports = coreWidgets
    .map(w => `import { ${w.componentName}, ${w.instructionName} } from '${w.importPath}'`)
    .join('\n')
  
  const externalImports = externalWidgets
    .map(w => `import { ${w.componentName}, ${w.instructionName} } from '${w.importPath}'`)
    .join('\n')
  
  const pluginImports = pluginWidgets
    .map(w => `import { ${w.componentName}, ${w.instructionName} } from '${w.importPath}'`)
    .join('\n') || '// No npm plugins installed'
  
  // Generate registry entries
  const registryEntries = widgets.map(w => {
    const sourceLabel = w.source === 'plugin' ? 'plugin' : w.source
    const packageLine = w.packageName ? `,\n    packageName: '${w.packageName}'` : ''
    
    return `  ${w.name}: {
    component: ${w.componentName},
    instruction: ${w.instructionName},
    enabled: true,
    source: '${sourceLabel}'${packageLine}
  }`
  }).join(',\n')
  
  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated by scripts/build-plugins.ts
 * 
 * This file is regenerated every time plugins are built.
 * To add or remove widgets, edit retool-widget-plugins.json
 */

import { type FC } from 'react'

// Core widget imports (src/components/widgets/)
${coreImports || '// No core widgets'}

// External widget imports (src/components/widgets/external/)
${externalImports || '// No external widgets'}

// NPM plugin imports (node_modules/)
${pluginImports}

// Widget instruction interface
interface WidgetInstruction {
  type: string
  instructions: string
  sourceDataModel: string | object
  hint?: string
}

// Widget configuration interface
interface GeneratedWidgetConfig {
  component: FC<any>
  instruction: WidgetInstruction
  enabled: boolean
  source: 'core' | 'external' | 'plugin'
  packageName?: string
}

// Generated widget registry
export const GENERATED_WIDGET_REGISTRY: Record<string, GeneratedWidgetConfig> = {
${registryEntries}
}

// Export list of all widget types
export const GENERATED_WIDGET_TYPES = Object.keys(GENERATED_WIDGET_REGISTRY)

// Export plugin metadata
export const PLUGIN_METADATA = {
  generatedAt: '${new Date().toISOString()}',
  coreWidgets: ${JSON.stringify(coreWidgets.map(w => w.name))},
  externalWidgets: ${JSON.stringify(externalWidgets.map(w => w.name))},
  npmPlugins: ${JSON.stringify(pluginWidgets.map(w => w.packageName))},
  configuredExternal: ${JSON.stringify(config.external || [])},
  externalAll: ${config.externalAll || false}
}
`
}

function generateAssetsCode(config: PluginConfiguration): string {
  const allCss: string[] = []
  const allFonts: string[] = []
  
  // Add global assets from config
  if (config.globalAssets?.css) {
    allCss.push(...config.globalAssets.css)
  }
  if (config.globalAssets?.fonts) {
    allFonts.push(...config.globalAssets.fonts)
  }
  
  // TODO: Add plugin-specific assets when npm plugins declare them
  
  // Deduplicate
  const uniqueCss = [...new Set(allCss)]
  const uniqueFonts = [...new Set(allFonts)]
  
  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated by scripts/build-plugins.ts
 * 
 * This file contains all CSS and font assets required by installed plugins.
 */

import React from 'react'

// CSS assets from plugins
const CSS_ASSETS: string[] = ${JSON.stringify(uniqueCss, null, 2)}

// Font assets from plugins
const FONT_ASSETS: string[] = ${JSON.stringify(uniqueFonts, null, 2)}

/**
 * Component that injects all plugin CSS and font assets
 * Include this in your app's root component
 */
export const PluginAssets: React.FC = () => {
  return (
    <>
      {/* Font preconnects */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Font assets */}
      {FONT_ASSETS.map((font, index) => (
        <link key={\`font-\${index}\`} href={font} rel="stylesheet" />
      ))}
      
      {/* CSS assets */}
      {CSS_ASSETS.map((css, index) => (
        <link key={\`css-\${index}\`} rel="stylesheet" href={css} />
      ))}
    </>
  )
}

// Export asset lists for programmatic access
export const pluginCssAssets = CSS_ASSETS
export const pluginFontAssets = FONT_ASSETS

// Asset metadata
export const ASSETS_METADATA = {
  generatedAt: '${new Date().toISOString()}',
  cssCount: ${uniqueCss.length},
  fontCount: ${uniqueFonts.length}
}
`
}

// ============================================================================
// Main Build Function
// ============================================================================

async function build() {
  console.log('\n🔧 Building Widget Plugin System\n')
  console.log('='.repeat(50))
  
  // Step 1: Load configuration
  log('Loading plugin configuration...', 'info')
  const config = loadPluginConfig()
  
  // Step 2: Discover core widgets (in main widgets folder)
  log('Discovering core widgets...', 'info')
  const coreWidgets = discoverCoreWidgets()
  log(`Found ${coreWidgets.length} core widgets`, 'success')
  
  // Step 3: Discover external widgets (from config)
  log('Loading external widgets from config...', 'info')
  const externalWidgets = discoverExternalWidgets(config.external, config.externalAll)
  log(`Loaded ${externalWidgets.length} external widgets`, 'success')
  
  // Step 4: Discover npm plugins
  log('Discovering npm plugins...', 'info')
  const npmPlugins = discoverAllNpmPlugins(config.plugins || [])
  log(`Found ${npmPlugins.length} npm plugins`, 'success')
  
  // Combine all widgets
  const allWidgets = [...coreWidgets, ...externalWidgets, ...npmPlugins]
  
  // Step 5: Generate registry
  log('Generating WidgetRegistry.generated.tsx...', 'info')
  const registryCode = generateRegistryCode(allWidgets, config)
  fs.writeFileSync(GENERATED_REGISTRY, registryCode)
  log(`Generated ${GENERATED_REGISTRY}`, 'success')
  
  // Step 6: Generate assets
  log('Generating GlobalAssets.generated.tsx...', 'info')
  const assetsCode = generateAssetsCode(config)
  fs.writeFileSync(GENERATED_ASSETS, assetsCode)
  log(`Generated ${GENERATED_ASSETS}`, 'success')
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Build Summary:')
  console.log(`   Core widgets: ${coreWidgets.length}`)
  console.log(`   External widgets: ${externalWidgets.length}`)
  console.log(`   NPM plugins: ${npmPlugins.length}`)
  console.log(`   Total widgets: ${allWidgets.length}`)
  console.log('='.repeat(50) + '\n')
  
  log('Plugin build complete!', 'success')
}

// Run build
build().catch((err: Error) => {
  log(`Build failed: ${err.message}`, 'error')
  process.exit(1)
})
