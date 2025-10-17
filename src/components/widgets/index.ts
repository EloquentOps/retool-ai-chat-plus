// Export individual widgets for direct use if needed
export { TextWidget, TextWidgetInstruction } from './TextWidget'
export { SelectWidget, SelectWidgetInstruction } from './SelectWidget'
export { ImageGridWidget, ImageGridWidgetInstruction } from './ImageGridWidget'
export { TabulatorWidget, TabulatorWidgetInstruction } from './TabulatorWidget'
export { InputWidget, InputWidgetInstruction } from './InputWidget'

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
