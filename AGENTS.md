# Agent Widget Development Guide

This guide provides comprehensive documentation for creating new widgets in the AI Chat Plus component library. It covers the widget architecture, API patterns, configuration options, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Widget Interface](#widget-interface)
3. [Widget System Architecture](#widget-system-architecture)
4. [Configuration System](#configuration-system)
5. [Creating a New Widget](#creating-a-new-widget)
6. [Widget Registration](#widget-registration)
7. [External Widgets](#external-widgets)
8. [NPM Plugin Packages](#npm-plugin-packages)
9. [Data Models](#data-models)
10. [Widget Callbacks](#widget-callbacks)
11. [Styling Guidelines](#styling-guidelines)
12. [Error Handling](#error-handling%)
13. [Best Practices](#best-practices)
14. [Advanced Features](#advanced-features)
15. [Widget Examples Reference](#widget-examples-reference)



## Architecture Overview

The widget system is built on a centralized registry pattern that allows for:
- Dynamic widget registration and configuration
- Runtime widget enabling/disabling
- Flexible data model support
- Event-driven interactions via callbacks
- Configurable options per widget

### Core Components

```
src/components/widgets/
├── WidgetRegistry.tsx              # Central registry and renderer
├── WidgetRegistry.generated.tsx   # Auto-generated registry (DO NOT EDIT)
├── GlobalAssets.generated.tsx     # Auto-generated CSS/font assets
├── index.ts                        # Exports and interfaces
├── TextWidget.tsx                  # Mandatory: Core text widget
└── external/                       # External widgets (development/testing)
    ├── ChartWidget.tsx
    ├── GoogleMapWidget.tsx
    ├── TabulatorWidget.tsx
    └── ... (other widgets)
```

### Widget System Architecture

The widget system uses a three-tier architecture:

1. **Core Widgets** (`src/components/widgets/*.tsx`)
   - Essential widgets that are always included
   - Currently: `TextWidget` (mandatory)
   - These are automatically discovered and included

2. **External Widgets** (`src/components/widgets/external/*.tsx`)
   - Widgets in development or ready for extraction
   - Included via configuration in `retool-widget-plugins.json`
   - Can be easily extracted to npm packages later

3. **NPM Plugin Packages** (`node_modules/@retool-ai-chat-plus/widget-*`)
   - Published widget packages from npm
   - Discovered via `widget.manifest.json` files
   - Included via configuration in `retool-widget-plugins.json`

### Build System

Widgets are automatically discovered and registered by the build script (`scripts/build-plugins.ts`):

- **Auto-discovery**: Scans folders and npm packages for widgets
- **Registry generation**: Creates `WidgetRegistry.generated.tsx` with all widgets
- **Asset management**: Generates `GlobalAssets.generated.tsx` for CSS/fonts
- **Configuration-driven**: Uses `retool-widget-plugins.json` to control which widgets are included

Run the build script:
```bash
npm run build:plugins
```

This script runs automatically during `npm run dev` and `npm run deploy`.



## Widget Interface

All widgets must implement the base widget interface:

```typescript
interface WidgetProps {
  source: string | object | array    // Main data input
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>  // Global widget configuration
}

// Widget Instruction Object
interface WidgetInstruction {
  type: string                      // Unique widget identifier
  instructions: string              // AI prompt instructions
  sourceDataModel: string | object  // Data structure specification
}
```



## Configuration System

The configuration system supports:
- **Global options**: Applied to all widgets via `widgetsOptions`
- **Widget-specific options**: Override or append instructions per widget type
- **Runtime control**: Enable/disable widgets dynamically

### Configuration Structure

```typescript
// In Retool component props
widgetsOptions: {
  google_map: {
    apiKey: "your-api-key",
    zoom: 15,
    height: "400px",
    center: [40.7128, -74.0060]
  },
  text: {
    addInstruction: "Always include source citations when available"
  }
}
```

### Configuration Keywords

- `instructions`: Completely replace the widget instructions
- `addInstruction`: Append additional instructions to the default one
- `sourceDataModel`: Override the content type and data model the agent should return if it thinks this widget needs to be rendered.

#### Example of instructions:

```typescript
widgetsOptions: {
  text: {
    instructions: "Always format text with proper citations and use markdown for code blocks. Include line numbers for code snippets."
  }
}
```

This completely replaces the default text widget instructions.

#### Example of addInstruction:

```typescript
widgetsOptions: {
  chart: {
    addInstruction: "Always include a title and axis labels. Use colors that are accessible for colorblind users."
  }
}
```

This appends additional instructions to the default chart widget instructions.

#### Example of sourceDataModel:

```typescript
widgetsOptions: {
  image_grid: {
    sourceDataModel: {
      images: "array of objects with 'url' and 'caption' fields",
      layout: "string - 'grid' | 'carousel' | 'masonry'",
      maxColumns: "number - maximum columns in grid layout"
    }
  }
}
```

This overrides the default sourceDataModel, telling the AI what data structure to return when using this widget.



## Creating a New Widget

### Step 1: Define the Widget Component with Memoization

**IMPORTANT**: All widgets must use React.memo to prevent unnecessary re-renders during polling. This is the default pattern for all widgets.

```typescript
// ExampleWidget.tsx
import React from 'react'
import { type FC } from 'react'

interface ExampleWidgetProps {
  source: string | YourDataType
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

// Define the component implementation
const ExampleWidgetComponent: FC<ExampleWidgetProps> = ({
  source,
  onWidgetCallback,
  historyIndex
}) => {
  // Handle data validation
  if (!source) {
    return <div>No data provided</div>
  }

  // Handle user interactions
  const handleClick = () => {
    onWidgetCallback?.({
      type: 'example_interaction',
      data: source,
      timestamp: Date.now()
    })
  }

  return (
    <div className={`example-widget`} onClick={handleClick}>
      {/* Your widget content */}
    </div>
  )
}

// Export the memoized component with custom comparison
export const ExampleWidget = React.memo(ExampleWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  
  // For simple widgets, compare source and historyIndex
  if (typeof prevProps.source === 'string' && typeof nextProps.source === 'string') {
    return prevProps.source === nextProps.source && prevProps.historyIndex === nextProps.historyIndex
  }
  
  // For complex objects, use JSON comparison
  if (typeof prevProps.source === 'object' && typeof nextProps.source === 'object') {
    return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source) && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  // For arrays, perform deep comparison
  if (Array.isArray(prevProps.source) && Array.isArray(nextProps.source)) {
    if (prevProps.source.length !== nextProps.source.length) {
      return false // Different lengths, allow re-render
    }
    
    // Compare each item
    for (let i = 0; i < prevProps.source.length; i++) {
      if (JSON.stringify(prevProps.source[i]) !== JSON.stringify(nextProps.source[i])) {
        return false // Item changed, allow re-render
      }
    }
    
    return prevProps.historyIndex === nextProps.historyIndex
  }
  
  // Different types, allow re-render
  return false
})
```

### Step 2: Define the Widget Instruction

The instruction object tells AI agents when and how to use your widget:

```typescript
export const ExampleWidgetInstruction = {
  type: 'example_widget',
  instructions: 'Use this widget when the user requests interactive elements or data visualization.',
  sourceDataModel: 'The string value that need to be display' // or complex object structure
}
```

### Step 3: Choose Widget Location

You have two options for where to place your widget:

#### Option A: External Widget (Recommended for Development)

Place your widget in `src/components/widgets/external/YourWidget.tsx`:

1. Create the widget file following the naming convention: `YourWidget.tsx` (PascalCase)
2. The widget name in the registry will be auto-converted to `snake_case` (e.g., `YourWidget` → `your_widget`)
3. Add the widget name to `retool-widget-plugins.json`:

```json
{
  "external": [
    "your_widget",
    "chart",
    "google_map"
  ]
}
```

4. Run `npm run build:plugins` to regenerate the registry

**Benefits:**
- Easy to develop and test
- Can be extracted to npm package later
- No manual registry editing required

#### Option B: NPM Plugin Package (For Distribution)

Create a separate npm package using the template:

1. Copy `templates/widget-package/` to a new directory
2. Follow the [NPM Plugin Packages](#npm-plugin-packages) section below
3. Publish to npm
4. Add to `retool-widget-plugins.json`:

```json
{
  "plugins": [
    "@retool-ai-chat-plus/widget-your-widget"
  ]
}
```

**Benefits:**
- Reusable across projects
- Versioned independently
- Can be shared with the community



## Widget Registration

### Automatic Registration

Widgets are automatically registered by the build script. You **do not need to manually edit** `WidgetRegistry.tsx` or `WidgetRegistry.generated.tsx`.

The build script (`scripts/build-plugins.ts`) automatically:
1. Discovers widgets in `src/components/widgets/` (core)
2. Discovers widgets in `src/components/widgets/external/` (external)
3. Discovers npm plugins in `node_modules/`
4. Generates `WidgetRegistry.generated.tsx` with all widgets
5. Generates `GlobalAssets.generated.tsx` with CSS/font assets

### Registry Structure

```typescript
interface GeneratedWidgetConfig {
  component: FC<any>           // React component
  instruction: WidgetInstruction
  enabled: boolean              // Runtime enable/disable
  source: 'core' | 'external' | 'plugin'  // Widget source
  packageName?: string          // NPM package name (for plugins)
}
```

### Registry Functions

- `renderWidget()`: Main rendering function
- `setWidgetEnabled()`: Enable/disable widgets at runtime
- `getEnabledWidgetTypes()`: Get list of enabled widget types
- `getAllWidgetInstructions()`: Get formatted instructions for AI agents

### Widget Naming Convention

- **File name**: `PascalCaseWidget.tsx` (e.g., `GoogleMapWidget.tsx`)
- **Registry key**: `snake_case` (e.g., `google_map`)
- **Component export**: `PascalCaseWidget` (e.g., `GoogleMapWidget`)
- **Instruction export**: `PascalCaseWidgetInstruction` (e.g., `GoogleMapWidgetInstruction`)

The build script handles name conversion automatically. Special cases are handled via `WIDGET_NAME_OVERRIDES` in the build script.



## External Widgets

External widgets are widgets stored in `src/components/widgets/external/` that are included via configuration. This is the recommended approach for developing new widgets.

### Creating an External Widget

1. **Create the widget file** in `src/components/widgets/external/YourWidget.tsx`:

```typescript
// src/components/widgets/external/YourWidget.tsx
import React from 'react'
import type { FC } from 'react'

interface YourWidgetProps {
  source: string | YourDataType
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const YourWidgetComponent: FC<YourWidgetProps> = ({ source, onWidgetCallback, historyIndex }) => {
  // Implementation
  return <div>...</div>
}

// REQUIRED: Memoize to prevent re-renders during polling
export const YourWidget = React.memo(YourWidgetComponent, (prev, next) => {
  return JSON.stringify(prev.source) === JSON.stringify(next.source) &&
         prev.historyIndex === next.historyIndex
})

// REQUIRED: Export instruction for AI
export const YourWidgetInstruction = {
  type: 'your_widget',  // Must match the name in retool-widget-plugins.json
  instructions: 'When to use this widget...',
  sourceDataModel: { field: 'description' }
}
```

2. **Add to configuration** in `retool-widget-plugins.json`:

```json
{
  "external": [
    "your_widget",
    "chart",
    "google_map"
  ]
}
```

3. **Build plugins**:

```bash
npm run build:plugins
```

### Widget Name Mapping

The build script automatically converts file names to registry keys:
- `YourWidget.tsx` → `your_widget`
- `GoogleMapWidget.tsx` → `google_map` (special case)
- `CheckListWidget.tsx` → `checklist` (special case)

### Extracting to NPM Package

When ready to publish an external widget as an npm package:

1. Copy `templates/widget-package/` to a new directory
2. Move widget code from `external/` to the new package
3. Update `widget.manifest.json` with widget details
4. Publish to npm
5. Add package name to `plugins` array in `retool-widget-plugins.json`
6. Remove from `external` array

## NPM Plugin Packages

NPM plugin packages allow widgets to be distributed independently, versioned, and reused across projects.

### Creating an NPM Plugin Package

1. **Use the template**:

```bash
cp -r templates/widget-package/ my-widget-package/
cd my-widget-package/
```

2. **Update `package.json`**:

```json
{
  "name": "@retool-ai-chat-plus/widget-your-widget",
  "version": "1.0.0",
  "description": "Your widget description",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "widget.manifest.json"]
}
```

3. **Update `widget.manifest.json`**:

```json
{
  "name": "your_widget",
  "version": "1.0.0",
  "displayName": "Your Widget",
  "component": "./src/YourWidget.tsx",
  "instruction": {
    "type": "your_widget",
    "instructions": "When to use this widget...",
    "sourceDataModel": {
      "field1": "description",
      "field2": "description"
    }
  },
  "assets": {
    "css": [],
    "fonts": []
  },
  "enabledByDefault": true
}
```

4. **Implement your widget** in `src/YourWidget.tsx`:

```typescript
// src/YourWidget.tsx
import React from 'react'
import type { FC } from 'react'

interface YourWidgetProps {
  source: string | YourDataType
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const YourWidgetComponent: FC<YourWidgetProps> = ({ source, onWidgetCallback, historyIndex }) => {
  // Implementation
  return <div>...</div>
}

// REQUIRED: Memoize component
export const YourWidget = React.memo(YourWidgetComponent, (prev, next) => {
  return JSON.stringify(prev.source) === JSON.stringify(next.source) &&
         prev.historyIndex === next.historyIndex
})

// REQUIRED: Export instruction
export const YourWidgetInstruction = {
  type: 'your_widget',
  instructions: 'When to use this widget...',
  sourceDataModel: { /* ... */ }
}
```

5. **Export from `src/index.ts`**:

```typescript
export { YourWidget, YourWidgetInstruction } from './YourWidget'
```

6. **Build and publish**:

```bash
npm run build
npm publish
```

### Installing NPM Plugins

1. **Install the package**:

```bash
npm install @retool-ai-chat-plus/widget-your-widget
```

2. **Add to `retool-widget-plugins.json`**:

```json
{
  "plugins": [
    "@retool-ai-chat-plus/widget-your-widget"
  ]
}
```

3. **Build plugins**:

```bash
npm run build:plugins
```

### Plugin Manifest Structure

The `widget.manifest.json` file tells the plugin system about your widget:

```typescript
interface WidgetPluginManifest {
  name: string                    // Unique identifier (snake_case)
  version: string                 // Semantic version
  displayName: string             // Human-readable name
  component: string               // Path to component file
  instruction: WidgetInstruction  // AI instruction object
  dependencies?: {
    runtime?: string[]            // Runtime dependencies
    peer?: string[]               // Peer dependencies
  }
  assets?: {
    css?: string[]                // CSS URLs
    fonts?: string[]              // Font URLs
  }
  enabledByDefault?: boolean      // Default enabled state
  category?: string               // Widget category
}
```

### Adding CSS/Fonts to Plugins

If your plugin needs external CSS or fonts, add them to the manifest:

```json
{
  "assets": {
    "css": [
      "https://cdn.example.com/widget-styles.css"
    ],
    "fonts": [
      "https://fonts.googleapis.com/css2?family=Custom+Font"
    ]
  }
}
```

These assets are automatically included in `GlobalAssets.generated.tsx`.

## Configuration File: retool-widget-plugins.json

The `retool-widget-plugins.json` file controls which widgets are included in the build.

### Configuration Structure

```json
{
  "$schema": "./schemas/plugin-config.schema.json",
  
  "external": [
    "canvas",
    "chart",
    "checklist",
    "confirm",
    "google_map",
    "tabulator"
  ],
  
  "plugins": [
    "@retool-ai-chat-plus/widget-example"
  ],
  
  "globalAssets": {
    "css": [
      "https://unpkg.com/tabulator-tables@6.3.1/dist/css/tabulator.min.css"
    ],
    "fonts": [
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
    ]
  }
}
```

### Configuration Fields

- **`external`** (array of strings): List of external widget names to include
  - Widget names should be in `snake_case` (e.g., `google_map`, `checklist`)
  - These correspond to files in `src/components/widgets/external/`
  - Empty array means no external widgets are included

- **`plugins`** (array of strings): List of npm package names to include
  - Package names should be the full npm package name
  - Packages must have a `widget.manifest.json` file
  - Empty array means no npm plugins are included

- **`globalAssets`** (object): Global CSS and font assets
  - **`css`** (array of strings): URLs to CSS files
  - **`fonts`** (array of strings): URLs to font files
  - These are included in `GlobalAssets.generated.tsx`

### Example Configurations

**Include only core widgets:**
```json
{
  "external": [],
  "plugins": []
}
```

**Include specific external widgets:**
```json
{
  "external": ["chart", "google_map"],
  "plugins": []
}
```

**Include npm plugins:**
```json
{
  "external": [],
  "plugins": ["@retool-ai-chat-plus/widget-chart"]
}
```

**Include everything:**
```json
{
  "external": ["canvas", "chart", "checklist", "confirm", "google_map", "tabulator"],
  "plugins": ["@retool-ai-chat-plus/widget-example"],
  "globalAssets": {
    "css": ["https://cdn.example.com/styles.css"],
    "fonts": ["https://fonts.googleapis.com/css2?family=Inter"]
  }
}
```

## Data Models

Widgets can accept various data types:

### String Type

```typescript
sourceDataModel: 'A string representing the button label'
```

### Objects Type

```typescript
// JSON Schema style
// try to be semantic as much as possible
sourceDataModel: {
  title: 'The title of the widget',
  caption: 'The caption of the widget'
}
```



## Widget Callbacks

Widgets communicate with the chat system through callback functions:

### Callback Structure

```typescript
onWidgetCallback(payload: Record<string, unknown>)
```

### Common Callback Patterns

```typescript
// User interaction
onWidgetCallback({
  type: 'button:clicked',
  buttonId: 'save',
  data: formData
})

// Data selection
onWidgetCallback({
  type: 'image:selected',
  selectedItem: itemData,
  index: 0
})

// Status update
onWidgetCallback({
  type: 'status:changed',
  status: 'loading' | 'success' | 'error',
  message: 'Operation completed'
})

// Error reporting
onWidgetCallback({
  type: 'error',
  message: 'Failed to load resource',
  error: errorDetails
})
```



## Styling Guidelines

### Design Principles

1. **Consistency**: Follow established color schemes and spacing
2. **Responsiveness**: Ensure widgets work on different screen sizes
3. **Accessibility**: Include proper ARIA labels and keyboard navigation
4. **Performance**: Use efficient rendering patterns



## Error Handling

### Error States

```typescript
const [error, setError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)

// In component
if (isLoading) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div>⏳</div>
      <div>Loading...</div>
    </div>
  )
}

if (error) {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      color: '#dc2626'
    }}>
      <div>❌</div>
      <div>{error}</div>
    </div>
  )
}
```



## Performance Optimization

### React.memo Pattern (MANDATORY)

All widgets must implement React.memo to prevent unnecessary re-renders during polling. This is the default pattern for all widgets in the system.

#### Why Memoization is Required

During polling, the entire message history is re-rendered, which can cause:
- Complex widgets (GoogleMap, Tabulator) to flash and lose state
- Unnecessary API calls and resource consumption
- Poor user experience with flickering interfaces

#### Memoization Implementation Patterns

**Simple Widgets (String/Number data):**
```typescript
export const SimpleWidget = React.memo(SimpleWidgetComponent, (prevProps, nextProps) => {
  return prevProps.source === nextProps.source && 
         prevProps.historyIndex === nextProps.historyIndex
})
```

**Object-based Widgets:**
```typescript
export const ObjectWidget = React.memo(ObjectWidgetComponent, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source) && 
         prevProps.historyIndex === nextProps.historyIndex
})
```

**Array-based Widgets:**
```typescript
export const ArrayWidget = React.memo(ArrayWidgetComponent, (prevProps, nextProps) => {
  if (prevProps.source.length !== nextProps.source.length) {
    return false
  }
  
  for (let i = 0; i < prevProps.source.length; i++) {
    if (JSON.stringify(prevProps.source[i]) !== JSON.stringify(nextProps.source[i])) {
      return false
    }
  }
  
  return prevProps.historyIndex === nextProps.historyIndex
})
```

**Complex Widgets with State Preservation:**
```typescript
// For widgets like GoogleMap, Tabulator that need to preserve internal state
export const ComplexWidget = React.memo(ComplexWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison that checks if meaningful data has changed
  // and preserves widget state when possible
  return customComparisonLogic(prevProps, nextProps)
})
```

### Widget State Preservation

For complex widgets that manage external resources (maps, tables, charts):

1. **Check for existing instances** before recreating
2. **Update existing instances** instead of destroying/recreating
3. **Preserve user interactions** (selections, positions, etc.)
4. **Minimize API calls** to external services

## Best Practices

### 1. Widget Design

- **Single Responsibility**: One widget = one purpose
- **Reusable Configuration**: Support customization via props and options
- **Graceful Degradation**: Handle missing data elegantly
- **Performance**: **ALWAYS** use React.memo for all widgets
- **State Preservation**: Preserve widget state during re-renders

### 2. Data Handling

- **Type Safety**: Use TypeScript interfaces
- **Validation**: Always validate incoming data
- **Fallbacks**: Provide sensible defaults
- **Error Recovery**: Allow retry mechanisms
- **Memoization**: Implement proper comparison functions

### 3. User Experience

- **Loading States**: Show progress indicators
- **Interactive Feedback**: Provide visual feedback on interactions
- **Accessibility**: Ensure keyboard navigation and screen reader support
- **Mobile Friendly**: Test on different devices
- **No Flashing**: Prevent widget flickering during polling

### 4. AI Integration

- **Clear Instructions**: Write specific, unambiguous instruction text
- **Data Examples**: Use examples in your sourceDataModel descriptions
- **Context Awareness**: Include when-to-use guidance in instructions



## Advanced Features

### External API Integration

Example with Google Maps:

```typescript
useEffect(() => {
  const initializeMap = async () => {
    try {
      setIsLoading(true)
      
      const apiKey = widgetsOptions?.google_map?.apiKey
      if (!apiKey) {
        throw new Error('API key required')
      }
      
      const loader = new Loader({ apiKey, version: 'weekly' })
      await loader.load()
      
      // Initialize external service
      
    } catch (err) {
      setError(`Failed to initialize: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  initializeMap()
}, [source, widgetsOptions])
```

### Complex State Management

```typescript
const [state, setState] = useState({
  isLoading: false,
  data: null,
  error: null,
  interactions: []
})

const handleInteraction = (interactionData) => {
  setState(prev => ({
    ...prev,
    interactions: [...prev.interactions, {
      ...interactionData,
      timestamp: Date.now()
    }]
  }))
  
  // Trigger callback
  onWidgetCallback?.({
    type: 'interaction_recorded',
    interaction: interactionData
  }))
}
```

### Configuration Overrides

```typescript
const getEffectiveConfig = (widgetOptions, defaultConfig) => {
  const config = { ...defaultConfig }
  
  if (widgetOptions?.theme) {
    config.theme = widgetOptions.theme
  }
  
  if (widgetOptions?.customStyles) {
    config.styles = { ...config.styles, ...widgetOptions.customStyles }
  }
  
  return config
}
```

### Testing Widgets

```typescript
// Component testing approach
const testWidget = (testCases) => {
  testCases.forEach(({ input, expected }) => {
    const widget = render(<ExampleWidget source={input} />)
    expect(widget).toMatchSnapshot()
  })
}
```

## Widget Examples Reference

### Simple Display Widget

```typescript
const TextWidgetComponent: FC<TextWidgetProps> = ({ source, historyIndex }) => {
  return (
    <div style={{ 
      fontSize: '14px', 
      lineHeight: '1.6',
      color: '#333333'
    }}>
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const TextWidget = React.memo(TextWidgetComponent, (prevProps, nextProps) => {
  // Simple comparison for text widget - only re-render if source text changes
  return prevProps.source === nextProps.source && prevProps.historyIndex === nextProps.historyIndex
})

export const TextWidgetInstruction = {
  type: 'text',
  instructions: 'Use for displaying markdown-formatted text content',
  sourceDataModel: 'string'
}
```

### Interactive Widget

```typescript
const ConfirmWidgetComponent: FC<ConfirmWidgetProps> = ({ 
  source, 
  variant = 'primary',
  onWidgetCallback,
  historyIndex
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const handleClick = () => {
    onWidgetCallback?.({ type: 'button_clicked', text: source })
  }
  
  return (
    <button
      style={getButtonStyles(variant, isHovered)}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {source}
    </button>
  )
}

// Memoized component to prevent unnecessary re-renders
export const ConfirmWidget = React.memo(ConfirmWidgetComponent, (prevProps, nextProps) => {
  // Compare source data (string or object)
  if (typeof prevProps.source === 'string' && typeof nextProps.source === 'string') {
    return prevProps.source === nextProps.source && prevProps.historyIndex === nextProps.historyIndex
  }
  
  if (typeof prevProps.source === 'object' && typeof nextProps.source === 'object') {
    return JSON.stringify(prevProps.source) === JSON.stringify(nextProps.source) && 
           prevProps.historyIndex === nextProps.historyIndex
  }
  
  // Different types, allow re-render
  return false
})
```

### Data Visualization Widget

```typescript
const ImageGridWidgetComponent: FC<ImageGridWidgetProps> = ({ 
  source, 
  onWidgetCallback,
  historyIndex
}) => {
  const handleImageClick = (imageItem, index) => {
    onWidgetCallback?.({
      type: 'image_selected',
      image: imageItem,
      index: index
    })
  }
  
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {source.map((item, index) => (
        <div key={index} onClick={() => handleImageClick(item, index)}>
          <img src={item.imageUrl} alt={item.caption} />
          {item.caption && <div>{item.caption}</div>}
        </div>
      ))}
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const ImageGridWidget = React.memo(ImageGridWidgetComponent, (prevProps, nextProps) => {
  // Compare array length
  if (prevProps.source.length !== nextProps.source.length) {
    return false // Array length changed, allow re-render
  }
  
  // Compare each image item
  for (let i = 0; i < prevProps.source.length; i++) {
    const prevItem = prevProps.source[i]
    const nextItem = nextProps.source[i]
    
    if (prevItem.imageUrl !== nextItem.imageUrl || prevItem.caption !== nextItem.caption) {
      return false // Image data changed, allow re-render
    }
  }
  
  // Compare historyIndex
  if (prevProps.historyIndex !== nextProps.historyIndex) {
    return false // History index changed, allow re-render
  }
  
  // Props are the same, prevent re-render
  return true
})
```

## Quick Reference: Widget Development Workflow

### For External Widgets (Development)

1. Create widget in `src/components/widgets/external/YourWidget.tsx`
2. Export component and instruction
3. Add widget name to `retool-widget-plugins.json` → `external` array
4. Run `npm run build:plugins`
5. Test your widget

### For NPM Plugin Packages (Distribution)

1. Copy `templates/widget-package/` to new directory
2. Update `package.json` and `widget.manifest.json`
3. Implement widget in `src/YourWidget.tsx`
4. Build: `npm run build`
5. Publish: `npm publish`
6. Install in main project: `npm install @retool-ai-chat-plus/widget-your-widget`
7. Add to `retool-widget-plugins.json` → `plugins` array
8. Run `npm run build:plugins`

### Build Commands

- `npm run build:plugins` - Regenerate widget registry from config
- `npm run dev` - Start dev server (auto-runs build:plugins)
- `npm run deploy` - Deploy to Retool (auto-runs build:plugins)

---

This guide provides everything needed to create robust, maintainable widgets for the AI Chat Plus system. For additional examples and patterns, refer to the existing widget implementations in the `src/components/widgets/` directory.