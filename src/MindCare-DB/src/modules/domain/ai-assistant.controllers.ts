import type { Request, Response } from 'express'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import {
  aiDraftSchema,
  aiImproveSchema,
  aiDiagnosisSchema,
} from './schemas.js'
import { aiService } from './ai-assistant.service.js'

export async function generateDraftController(req: Request, res: Response) {
  const body = parseBody(aiDraftSchema, req.body)
  const result = await aiService.generateDraft(body)
  res.json(result)
}

export async function improveTextController(req: Request, res: Response) {
  const body = parseBody(aiImproveSchema, req.body)

  if (!body.currentText.trim()) {
    throw new AppError(400, 'O texto atual não pode estar vazio')
  }

  const result = await aiService.improveText({
    currentText: body.currentText,
    instruction: body.instruction,
  })

  res.json(result)
}

export async function suggestDiagnosisController(req: Request, res: Response) {
  const body = parseBody(aiDiagnosisSchema, req.body)
  const result = await aiService.suggestDiagnosis({ clinicalText: body.clinicalText })
  res.json(result)
}
