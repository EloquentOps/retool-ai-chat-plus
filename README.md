# AI Chat Plus - Retool Custom Component

A powerful custom Chat component for Retool that provides enhanced AI chat functionality with support for rendering interactive widgets in the chat flow, rich content, and seamless integration with AI agents.

## Features

- **Interactive Chat Interface**: Modern, responsive chat UI with message history
- **Widget System**: Extensible widget framework for rich content display
- **AI Agent Integration**: Built-in support for Retool AI agents with polling and status management
- **Error Handling**: Comprehensive error handling with retry capabilities
- **Customizable UI**: Configurable welcome messages, prompt chips, and styling options
- **Real-time Updates**: Live status updates and message streaming

## AI Agent Integration & Best Practices

### Core Concept

The AI Chat Plus component is designed to work seamlessly with Retool AI agents by injecting specialized prompt instructions that guide the LLM to respond with structured JSON containing specific widget parameters. This approach allows for rich, interactive content rendering while maintaining consistency and reliability.

### How It Works

1. **Prompt Injection**: The component automatically injects widget-specific instructions into your AI agent's prompt
2. **JSON Response**: The LLM is guided to respond with structured JSON containing widget type and data
3. **Widget Rendering**: The component parses the JSON response and renders the appropriate widget
4. **User Interaction**: Widget interactions are captured and can trigger additional AI agent calls

### LLM Model Compatibility

**Recommended**: This component has been extensively tested with **OpenAI GPT-4.1** and shows the highest reliability and consistency in following widget instructions.

**Alternative Models**: While the component can work with other LLM models, our testing shows reduced reliability in:
- Following widget-specific instructions
- Generating consistent JSON responses
- Maintaining widget data structure integrity

**Best Practice**: Use OpenAI GPT-4.1 for optimal results, especially in production environments.

### Agent Architecture Best Practices

#### 1. Specialized Agent Approach

Instead of using many tools in a single agent, follow this pattern:

```
Chat Agent (Primary)
├── Specialized for chat responses
├── Uses widget instructions for rich content
└── Delegates complex tasks to specialized agents

Specialized Agents (Secondary)
├── Focus on specific domains (get data and data processing)
├── Can use different LLM models as needed
├── Return results to chat agent for widget rendering
└── Handle complex tool operations
```

#### 2. Agent Separation Strategy

- **Chat Agent**: Handles conversation flow, widget responses, and user interaction
- **Tool Agents**: Handle specific operations (data queries, API calls, complex processing)
- **Result Integration**: Specialized agents return data that chat agent formats into widgets

#### 3. Benefits of Specialized Agents

- **Better Performance**: Each agent can be optimized for its specific task
- **Model Flexibility**: Different agents can use different LLM models
- **Error Isolation**: Failures in one agent don't affect the main chat experience
- **Scalability**: Easy to add new specialized agents without affecting existing ones

### Widget Instruction Customization

Each widget includes customizable instructions that can be modified per widget for easy personalization:

```javascript
widgetsOptions: {
  google_map: {
    // Override default instructions
    instructions: "Use this widget to display location-based information with interactive maps. Always include a brief description of the location and its significance.",
    
    // Add to existing instructions
    addInstruction: "Include nearby points of interest when available",
    
    // Override expected data model
    sourceDataModel: {
      type: 'object',
      properties: {
        coordinates: { type: 'string', description: 'Latitude,longitude coordinates' },
        title: { type: 'string', description: 'Location title' },
        description: { type: 'string', description: 'Location description' }
      }
    }
  }
}
```

### Implementation Example

```javascript
// Chat Agent Configuration
const chatAgent = {
  model: "gpt-4",
  systemPrompt: "You are a helpful assistant that can display rich content using widgets...",
  // Widget instructions are automatically injected
}

// Specialized Data Agent
const dataAgent = {
  model: "gpt-4", // or gpt-3.5-turbo for cost optimization
  tools: ["database", "api"],
  systemPrompt: "You are a data analysis specialist..."
}

// Integration Flow
1. User asks: "Show me sales data for Q1"
2. Chat agent delegates to data agent
3. Data agent processes request and returns structured data
4. Chat agent formats response with appropriate widget
5. Component renders interactive sales chart/grid
```

## Available Widgets

### Text Widget
Renders markdown-formatted text with support for headers, bold, italic, lists, code blocks, and links.

**Usage**: Automatically used for text responses
```json
{
  "type": "text",
  "source": "**Bold text** and *italic text* with [links](https://example.com)"
}
```

### Google Maps Widget
Displays interactive Google Maps with location markers and geocoding support.

**Usage**: For location-based queries
```json
{
  "type": "google_map",
  "source": "40.7128,-74.0060"
}
```

**Configuration Options**:
- `apiKey`: Google Maps API key
- `zoom`: Map zoom level (default: 15)
- `height`: Map height (default: "300px")
- `center`: Custom center coordinates [lat, lng]

### Image Grid Widget
Displays a responsive grid of images with captions and click interactions.

**Usage**: For image galleries
```json
{
  "type": "image_grid",
  "source": [
    {
      "imageUrl": "https://example.com/image1.jpg",
      "caption": "Image 1"
    },
    {
      "imageUrl": "https://example.com/image2.jpg",
      "caption": "Image 2"
    }
  ]
}
```

### Confirm Widget
Interactive button for user confirmations and actions.

**Usage**: For user interactions
```json
{
  "type": "confirm",
  "source": "Save Changes",
  "variant": "primary",
  "size": "medium",
  "disabled": false
}
```

**Properties**:
- `variant`: "primary" | "secondary" | "danger"
- `size`: "small" | "medium" | "large"
- `disabled`: boolean

### Selector Widget
Dropdown selector for choosing from predefined options.

**Usage**: For option selection
```json
{
  "type": "selector",
  "source": {
    "placeholder": "Select an option...",
    "options": [
      {"value": "option1", "label": "Option 1"},
      {"value": "option2", "label": "Option 2"}
    ]
  }
}
```

### Image Widget
Single image display with optional captions.

**Usage**: For single image display
```json
{
  "type": "image",
  "source": "https://example.com/image.jpg"
}
```

## Component Properties

### Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `welcomeMessage` | string | "" | Welcome message displayed when chat is empty |
| `widgetsOptions` | object | {} | Widget configuration options (keys determine enabled widgets, empty = only text widget) |
| `promptChips` | array | [] | Suggested action chips for quick interactions |
| `history` | array | [] | Chat message history |
| `queryResponse` | object | {} | AI agent response data |
| `agentInputs` | object | {} | AI agent input parameters |
| `widgetPayload` | object | {} | Widget interaction payload |
| `submitWithPayload` | object | {} | Programmatic submit with payload |

### Events

| Event | Description |
|-------|-------------|
| `submitQuery` | Triggered when a query is submitted to the AI agent |
| `widgetCallback` | Triggered when a widget interaction occurs |

## Setup

### Environment Variables

To use the Google Maps widget, you need to set up a Google Maps API key:

1. Get a Google Maps API key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Create a `.env` file in the project root
3. Add your API key to the `.env` file:

```bash
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Deploy to Retool:
```bash
npm run deploy
```

## Usage Examples

### Basic Chat Setup

1. Add the AI Chat Plus component to your Retool app
2. Connect it to your AI agent query
3. Configure the `submitQuery` event to trigger your agent
4. Set up the `queryResponse` property to receive agent responses

### Widget Configuration

Configure specific widgets and their options. Only widgets with keys in `widgetsOptions` will be enabled (plus the text widget which is always enabled):

```javascript
// Configure widget options (keys determine enabled widgets)
widgetsOptions: {
  google_map: {
    apiKey: "your_google_maps_api_key",
    zoom: 12,
    height: "400px"
  },
  image_grid: {
    maxImages: 6
  }
}

// Only text widget enabled (empty object)
widgetsOptions: {}
```

### Prompt Chips

Add suggested action chips for better user experience:

```javascript
promptChips: [
  {
    icon: "🗺️",
    label: "Show Map",
    question: "Show me a map of New York City"
  },
  {
    icon: "📊",
    label: "Generate Report",
    question: "Generate a sales report for this month"
  }
]
```

### AI Agent Integration

The component automatically handles:
- Message formatting for AI agents
- Response parsing and widget rendering
- Status polling and updates
- Error handling and retry logic

## Advanced Configuration

### Custom Widget Instructions

Override widget instructions for specific use cases:

```javascript
widgetsOptions: {
  google_map: {
    instructions: "Use this widget to display location-based information with interactive maps",
    addInstruction: "Always include a brief description of the location"
  }
}
```

### Programmatic Control

Submit queries programmatically:

```javascript
// Submit with payload
submitWithPayload: {
  action: "submit",
  payload: "Your message here"
}

// Stop current operation
submitWithPayload: {
  action: "stop"
}
```

## Development

### Project Structure

```
src/
├── components/
│   ├── ChatContainer.tsx      # Main chat interface
│   ├── MessageList.tsx        # Message display component
│   ├── InputBar.tsx           # Input and submit controls
│   ├── ErrorMessage.tsx       # Error display component
│   └── widgets/               # Widget implementations
│       ├── WidgetRegistry.tsx # Widget registration and management
│       ├── TextWidget.tsx     # Text rendering widget
│       ├── GoogleMapWidget.tsx # Google Maps integration
│       ├── ImageGridWidget.tsx # Image gallery widget
│       ├── ConfirmWidget.tsx  # Button widget
│       ├── SelectorWidget.tsx # Dropdown widget
│       └── ImageWidget.tsx    # Single image widget
└── index.tsx                  # Main component entry point
```

### Adding New Widgets

1. Create a new widget component in `src/components/widgets/`
2. Define the widget instruction object
3. Register the widget in `WidgetRegistry.tsx`
4. Export the widget from `widgets/index.ts`

### Widget Development Guidelines

- Follow the established widget interface pattern
- Include proper TypeScript types
- Implement error handling and loading states
- Support widget callbacks for user interactions
- Document widget instructions and data models

## Troubleshooting

### Common Issues

1. **Google Maps not loading**: Ensure API key is properly configured
2. **Widgets not rendering**: Check that widgets are configured in `widgetsOptions` object
3. **AI agent not responding**: Verify query connection and response format
4. **Styling issues**: Check for CSS conflicts with Retool's default styles

### Debug Mode

Enable debug logging by checking the browser console for detailed widget and component logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the [Retool documentation](https://docs.retool.com/apps/guides/custom/custom-component-libraries)
- Open an issue in this repository
- Contact the development team

---

**Note**: This component requires Retool's custom component library support and is designed to work with Retool AI agents.
