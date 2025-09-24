// Export individual widgets for direct use if needed
export { TextWidget, TextWidgetInstruction } from './TextWidget'
// export { ColorWidget, ColorWidgetInstruction } from './ColorWidget'
// export { ImageWidget, ImageWidgetInstruction } from './ImageWidget'

// Export the centralized registry system
export { 
  WIDGET_REGISTRY,
  renderWidget,
  getAllWidgetInstructions,
  setWidgetEnabled,
  getEnabledWidgetTypes
} from './WidgetRegistry'
