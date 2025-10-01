// Export individual widgets for direct use if needed
export { TextWidget, TextWidgetInstruction } from './TextWidget'
export { SelectorWidget, SelectorWidgetInstruction } from './SelectorWidget'
export { ImageGridWidget, ImageGridWidgetInstruction } from './ImageGridWidget'

// Export the centralized registry system
export { 
  WIDGET_REGISTRY,
  renderWidget,
  getAllWidgetInstructions,
  setWidgetEnabled,
  getEnabledWidgetTypes,
  getStructuredWidgetInstructions
} from './WidgetRegistry'
