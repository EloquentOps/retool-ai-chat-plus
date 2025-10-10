declare module 'react-mentions' {
  import { ComponentType, ReactNode } from 'react'

  export interface MentionsInputProps {
    value: string
    onChange: (event: React.ChangeEvent<HTMLInputElement>, newValue: string, newPlainTextValue: string, mentions: unknown[]) => void
    onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void
    placeholder?: string
    singleLine?: boolean
    style?: Record<string, any>
    children: ReactNode
    forceSuggestionsAboveCursor?: boolean
  }

  export interface MentionProps {
    trigger: string
    data: Array<{ id: string; display: string; [key: string]: any }>
    displayTransform?: (id: string, display: string) => string
    markup?: string
    appendSpaceOnAdd?: boolean
    renderSuggestion?: (entry: any, search: string, highlightedDisplay: string, index: number, focused: boolean) => ReactNode
  }

  export const MentionsInput: ComponentType<MentionsInputProps>
  export const Mention: ComponentType<MentionProps>
}
