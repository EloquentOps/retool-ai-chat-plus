/**
 * Normalized step from agent trace (getLogs response).
 * Used to list and inspect intermediate actions/thinking per response block.
 */
export interface TraceStep {
  type: string
  id: string
  timestamp?: number
  iteration?: number
  toolName?: string
  toolUseReasoning?: string
  toolUseReasoningSummary?: string
  toolParameters?: Record<string, unknown>
  toolExecutionResult?: unknown
}

export interface MessageWithTrace {
  role: 'user' | 'assistant'
  content: string | { type: string; source?: string; [key: string]: unknown }
  hidden?: boolean
  blockId?: number
  blockIndex?: number
  blockTotal?: number
  traceSteps?: TraceStep[]
}
