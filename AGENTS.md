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
├── TextWidget.tsx        # Example: Simple text widget
├── ConfirmWidget.tsx     # Example: Interactive button widget
├── GoogleMapWidget.tsx   # Example: External API integration
└── ImageGridWidget.tsx   # Example: Complex data model widget
```

## Widget Interface

All widgets must implement the base widget interface:

```typescript
interface WidgetProps {
  source: string | object | array    // Main data input
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>  // Global widget configuration
  [key: string]: unknown             // Additional widget-specific props
}

// Widget Instruction Object
interface WidgetInstruction {
  type: string                       // Unique widget identifier
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

### Step 1: Define the Widget Component

```typescript
// ExampleWidget.tsx
import React from 'react'
import { type FC } from 'react'

interface ExampleWidgetProps {
  source: string | YourDataType
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  // Add custom props with default values
  theme?: 'light' | 'dark'
  size?: 'small' | 'medium' | 'large'
}

export const ExampleWidget: FC<ExampleWidgetProps> = ({
  source,
  theme = 'light',
  size = 'medium',
  onWidgetCallback
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
    <div className={`example-widget ${theme} ${size}`} onClick={handleClick}>
      {/* Your widget content */}
    </div>
  )
}
```

### Step 2: Define the Widget Instruction

The instruction object tells AI agents when and how to use your widget:

```typescript
export const ExampleWidgetInstruction = {
  type: 'example_widget',
  instructions: 'Use this widget when the user requests interactive elements or data visualization. The source should contain the data to display.',
  sourceDataModel: 'string' // or complex object structure
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

### Step 4: Export from Index

Add to `widgets/index.ts`:

```typescript
export { ExampleWidget, ExampleWidgetInstruction } from './ExampleWidget'
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

### Simple Types

```typescript
// String
sourceDataModel: 'string'

// Number  
sourceDataModel: 'number'

// Boolean
sourceDataModel: 'boolean'
```

### Complex Objects

```typescript
// JSON Schema style
sourceDataModel: {
  type: 'object',
  properties: {
    title: { 
      type: 'string',
      description: 'Widget title' 
    },
    settings: { 
      type: 'object',
      description: 'Configuration options' 
    },
    data: { 
      type: 'array',
      description: 'Array of data items' 
    }
  },
  required: ['title', 'data']
}
```

### Array Data Models

```typescript
sourceDataModel: {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      imageUrl: { type: 'string' }
    }
  }
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
  type: 'button_clicked',
  buttonId: 'save',
  data: formData
})

// Data selection
onWidgetCallback({
  type: 'item_selected',
  selectedItem: itemData,
  index: 0
})

// Status update
onWidgetCallback({
  type: 'status_changed',
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

### Styling Patterns

```typescript
// Inline styles approach (recommended)
const widgetStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
}

// Hover effects
const hoverStyles: React.CSSProperties = {
  transform: 'scale(1.02)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.2s ease-in-out'
}
```

### Color Palette

```typescript
const colors = {
  primary: '#3b82f6',
  secondary: '#6b7280', 
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  text: '#374151'
}
```

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

### Validation Patterns

```typescript
// Data validation
const validateData = (data: unknown): boolean => {
  if (typeof data === 'string' && data.trim().length > 0) {
    return true
  }
  return false
}

// Prop validation with defaults
const {
  theme = 'light',
  size = 'medium',
  disabled = false
} = props
```

## Best Practices

### 1. Widget Design

- **Single Responsibility**: One widget = one purpose
- **Reusable Configuration**: Support customization via props and options
- **Graceful Degradation**: Handle missing data elegantly
- **Performance**: Use React.memo for expensive rendering

### 2. Data Handling

- **Type Safety**: Use TypeScript interfaces
- **Validation**: Always validate incoming data
- **Fallbacks**: Provide sensible defaults
- **Error Recovery**: Allow retry mechanisms

### 3. User Experience

- **Loading States**: Show progress indicators
- **Interactive Feedback**: Provide visual feedback on interactions
- **Accessibility**: Ensure keyboard navigation and screen reader support
- **Mobile Friendly**: Test on different devices

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
export const TextWidget: FC<TextWidgetProps> = ({ source }) => {
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

export const TextWidgetInstruction = {
  type: 'text',
  instructions: 'Use for displaying markdown-formatted text content',
  sourceDataModel: 'string'
}
```

### Interactive Widget

```typescript
export const ConfirmWidget: FC<ConfirmWidgetProps> = ({ 
  source, 
  variant = 'primary',
  onWidgetCallback 
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
```

### Data Visualization Widget

```typescript
export const ImageGridWidget: FC<ImageGridWidgetProps> = ({ 
  source, 
  onWidgetCallback 
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
```

This guide provides everything needed to create robust, maintainable widgets for the AI Chat Plus system. For additional examples and patterns, refer to the existing widget implementations in the `src/components/widgets/` directory.