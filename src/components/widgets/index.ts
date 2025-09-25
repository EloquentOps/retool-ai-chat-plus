// Export individual widgets for direct use if needed
export { TextWidget, TextWidgetInstruction } from './TextWidget'
// export { ColorWidget, ColorWidgetInstruction } from './ColorWidget'
// export { ImageWidget, ImageWidgetInstruction } from './ImageWidget'
//export { GMapWidget, GMapWidgetInstruction } from './GMapWidget'
//export { ConfirmWidget, ConfirmWidgetInstruction } from './ConfirmWidget'

// Export the centralized registry system
export { 
  WIDGET_REGISTRY,
  renderWidget,
  getAllWidgetInstructions,
  setWidgetEnabled,
  getEnabledWidgetTypes
} from './WidgetRegistry'
