import type { Request, Response } from 'express'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import { logAiCall } from '../../shared/ai-logger.js'
import {
  aiDraftSchema,
  aiImproveSchema,
  aiDiagnosisSchema,
} from './schemas.js'
import { aiService } from './ai-assistant.service.js'

export async function generateDraftController(req: Request, res: Response) {
  const body = parseBody(aiDraftSchema, req.body)
  const start = Date.now()
  let aiResponse: string | undefined
  let success = true
  let errorMessage: string | undefined

  try {
    const result = await aiService.generateDraft(body)
    aiResponse = JSON.stringify(result)
    res.json(result)
  } catch (err) {
    success = false
    errorMessage = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    await logAiCall({
      userId: req.user!.id,
      actionType: 'draft_record',
      prompt: JSON.stringify(body),
      response: aiResponse,
      durationMs: Date.now() - start,
      success,
      errorMessage,
    })
  }
}

export async function improveTextController(req: Request, res: Response) {
  const body = parseBody(aiImproveSchema, req.body)

  if (!body.currentText.trim()) {
    throw new AppError(400, 'O texto atual não pode estar vazio')
  }

  const start = Date.now()
  let aiResponse: string | undefined
  let success = true
  let errorMessage: string | undefined

  try {
    const result = await aiService.improveText({
      currentText: body.currentText,
      instruction: body.instruction,
    })
    aiResponse = JSON.stringify(result)
    res.json(result)
  } catch (err) {
    success = false
    errorMessage = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    await logAiCall({
      userId: req.user!.id,
      actionType: 'improve_text',
      prompt: JSON.stringify(body),
      response: aiResponse,
      durationMs: Date.now() - start,
      success,
      errorMessage,
    })
  }
}

export async function suggestDiagnosisController(req: Request, res: Response) {
  const body = parseBody(aiDiagnosisSchema, req.body)
  const start = Date.now()
  let aiResponse: string | undefined
  let success = true
  let errorMessage: string | undefined

  try {
    const result = await aiService.suggestDiagnosis({ clinicalText: body.clinicalText })
    aiResponse = JSON.stringify(result)
    res.json(result)
  } catch (err) {
    success = false
    errorMessage = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    await logAiCall({
      userId: req.user!.id,
      actionType: 'suggest_diagnosis',
      prompt: JSON.stringify(body),
      response: aiResponse,
      durationMs: Date.now() - start,
      success,
      errorMessage,
    })
  }
}
