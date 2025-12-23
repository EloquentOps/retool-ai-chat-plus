# Widget Plugin Template

This is a template for creating widget plugins for Retool AI Chat Plus.

## Quick Start

1. Copy this template to a new directory
2. Update `package.json` with your widget name
3. Update `widget.manifest.json` with your widget configuration
4. Implement your widget in `src/ExampleWidget.tsx` (rename as needed)
5. Build and publish

## Directory Structure

```
your-widget-package/
├── package.json           # NPM package configuration
├── widget.manifest.json   # Widget plugin manifest
├── tsconfig.json          # TypeScript configuration
├── src/
│   ├── index.ts           # Package entry point
│   └── ExampleWidget.tsx  # Widget implementation
└── dist/                  # Built output (generated)
```

## Widget Manifest

The `widget.manifest.json` file tells the plugin system about your widget:

```json
{
  "name": "your_widget",           // Unique identifier (snake_case)
  "version": "1.0.0",              // Semantic version
  "displayName": "Your Widget",    // Human-readable name
  "component": "./src/YourWidget.tsx",  // Path to component
  "instruction": {
    "type": "your_widget",         // Must match name
    "instructions": "When to use this widget...",
    "sourceDataModel": {           // Data structure for AI
      "field1": "description",
      "field2": "description"
    }
  },
  "assets": {                      // Optional CSS/fonts
    "css": [],
    "fonts": []
  }
}
```

## Widget Implementation

All widgets must follow these patterns:

### 1. Standard Props Interface

```typescript
interface YourWidgetProps {
  source: string | YourDataType        // Main data input
  onWidgetCallback?: (payload) => void  // Interaction handler
  widgetsOptions?: Record<string, unknown>  // Global config
  historyIndex?: number                 // Message index
}
```

### 2. React.memo Wrapper (Required!)

```typescript
export const YourWidget = React.memo(YourWidgetComponent, (prev, next) => {
  // Custom comparison to prevent unnecessary re-renders
  return JSON.stringify(prev.source) === JSON.stringify(next.source) &&
         prev.historyIndex === next.historyIndex
})
```

### 3. Widget Instruction Export

```typescript
export const YourWidgetInstruction = {
  type: 'your_widget',
  instructions: 'Description for AI...',
  sourceDataModel: { /* ... */ }
}
```

## Widget Callbacks

Widgets communicate back via callbacks:

```typescript
onWidgetCallback?.({
  type: 'widget_name:action',    // Action identifier
  widgetType: 'your_widget',     // Widget type
  data: { /* payload */ },       // Custom data
  historyIndex,                  // Message index
  timestamp: Date.now()          // Timestamp
})
```

## Adding CSS/Fonts

If your widget needs external CSS or fonts, add them to the manifest:

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

## Installation

After publishing, add to the main project:

1. Install the package:
   ```bash
   npm install @your-org/widget-your-widget
   ```

2. Add to `retool-widget-plugins.json`:
   ```json
   {
     "plugins": [
       "@your-org/widget-your-widget"
     ]
   }
   ```

3. Build plugins:
   ```bash
   npm run build:plugins
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

## License

MIT

