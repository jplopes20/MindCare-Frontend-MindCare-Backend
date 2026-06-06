import { db } from '../db/index.js'
import { aiLogs } from '../db/schema/index.js'

interface LogAiCallOptions {
  userId: number
  professionalId?: number
  medicalRecordId?: number
  actionType: 'draft_record' | 'improve_text' | 'suggest_diagnosis' | 'summarize' | 'other'
  prompt: string
  response?: string
  model?: string
  tokensUsed?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

export async function logAiCall(opts: LogAiCallOptions): Promise<void> {
  try {
    await db.insert(aiLogs).values({
      userId: opts.userId,
      professionalId: opts.professionalId,
      medicalRecordId: opts.medicalRecordId,
      actionType: opts.actionType,
      prompt: opts.prompt,
      response: opts.response,
      model: opts.model ?? 'unknown',
      tokensUsed: opts.tokensUsed,
      durationMs: opts.durationMs,
      success: opts.success ?? true,
      errorMessage: opts.errorMessage,
      metadata: opts.metadata,
    })
  } catch (err) {
    console.error('[AiLogger] Falha ao registrar log de IA:', err)
  }
}
