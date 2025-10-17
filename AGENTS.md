# Agent Widget Development Guide

This guide provides comprehensive documentation for creating new widgets in the AI Chat Plus component library. It covers the widget architecture, API patterns, configuration options, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Widget Interface](#widget-interface)
3. [Configuration System](#configuration-system)
4. [Creating a New Widget](#creating-a-new-widget)
5. [Widget Registration](#widget-registration)
6. [Data Models](#data-models)
7. [Widget Callbacks](#widget-callbacks)
8. [Styling Guidelines](#styling-guidelines)
9. [Error Handling](#error-handling%)
10. [Best Practices](#best-practices)
11. [Advanced Features](#advanced-features)
12. [Widget Examples Reference](#widget-examples-reference)



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
├── WidgetRegistry.tsx    # Central registry and renderer
├── index.ts              # Exports and interfaces
├── TextWidget.tsx        # Mandatory: Core text widget
├── ...Widget.tsx     		# Your widget: make your own
```



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

#### Example of addInstruction:

#### Example of sourceDataModel:



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

### Step 3: Register the Widget

Add to `WidgetRegistry.tsx`:

```typescript
import { ExampleWidget, ExampleWidgetInstruction } from './ExampleWidget'

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  // ... existing widgets
  example_widget: {
    component: ExampleWidget,
    instruction: ExampleWidgetInstruction,
    enabled: true
  }
}
```



## Widget Registration

### Registry Structure

```typescript
interface WidgetConfig {
  component: FC<any>           // React component
  instruction: WidgetInstruction
  enabled: boolean            // Runtime enable/disable
}

const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  widget_name: {
    component: WidgetComponent,
    instruction: WidgetInstruction,
    enabled: true
  }
}
```

### Registry Functions

- `renderWidget()`: Main rendering function
- `setWidgetEnabled()`: Enable/disable widgets at runtime
- `getEnabledWidgetTypes()`: Get list of enabled widget types
- `getAllWidgetInstructions()`: Get formatted instructions for AI agents



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

This guide provides everything needed to create robust, maintainable widgets for the AI Chat Plus system. For additional examples and patterns, refer to the existing widget implementations in the `src/components/widgets/` directory.