// Export individual widgets for direct use if needed
export { TextWidget, TextWidgetInstruction } from './TextWidget'

// Export the centralized registry system
export { 
  WIDGET_REGISTRY,
  renderWidget,
  getAllWidgetInstructions,
  getWidgetInstructionsForTypes,
  setWidgetEnabled,
  getEnabledWidgetTypes,
  getStructuredWidgetInstructions
} from './WidgetRegistry'
