// Export individual widgets for direct use if needed
export { TextWidget, TextWidgetInstruction } from './TextWidget'
export { RiskCardsWidget, RiskCardsWidgetInstruction } from './RiskCardsWidget'
export { BattlecardWidget, BattlecardWidgetInstruction } from './BattlecardWidget'
export { DiscoveryQuestionsWidget, DiscoveryQuestionsWidgetInstruction } from './DiscoveryQuestionsWidget'

// Export the centralized registry system
export { 
  WIDGET_REGISTRY,
  renderWidget,
  getAllWidgetInstructions,
  getWidgetInstructionsForTypes,
  setWidgetEnabled,
  getEnabledWidgetTypes,
  getStructuredWidgetInstructions,
  // Plugin system exports
  registerWidget,
  unregisterWidget,
  getRegistryMetadata
} from './WidgetRegistry'

// Export types
export type { WidgetInstruction, WidgetConfig, WidgetRegistryType } from './WidgetRegistry'

// Export GlobalAssets for CSS/font injection
export { GlobalAssets, CORE_ASSETS, getMergedAssets } from './GlobalAssets'
export type { AssetConfig, GlobalAssetsProps } from './GlobalAssets'
