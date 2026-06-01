import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { documents } from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import { getStorageProvider } from '../../shared/storage.js'
import * as services from './services.js'
import { createDocumentSchema, updateDocumentSchema, archiveDocumentSchema, uploadFromUrlSchema, uploadFromDriveSchema } from './schemas.js'
import type { CreateDocument, UpdateDocument } from './schemas.js'

const storage = getStorageProvider()

async function resolvePatientId(
  userId: number,
  role: string,
  bodyPatientId?: number,
): Promise<number> {
  if (role === 'patient') {
    const patient = await services.getPatientByUserId(userId)
    if (!patient) {
      throw new AppError(404, 'Perfil de paciente não encontrado. Complete seu cadastro primeiro.')
    }
    return patient.id
  }

  if (!bodyPatientId) {
    throw new AppError(400, 'patientId é obrigatório para profissionais e admins')
  }
  return bodyPatientId
}

export async function uploadDocumentController(req: Request, res: Response) {
  const file = req.file
  if (!file) {
    throw new AppError(400, 'Nenhum arquivo enviado')
  }

  const user = req.user!
  const body = parseBody(createDocumentSchema, req.body) as CreateDocument

  const patientId = await resolvePatientId(user.id, user.role, body.patientId)

  let resolvedProfessionalId: number | null = null
  if (user.role === 'professional') {
    const prof = await services.getProfessionalByUserId(user.id)
    if (prof) {
      resolvedProfessionalId = prof.id
    }
  }

  const { key } = await storage.upload(
    {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    },
    `patients/${patientId}`,
  )

  const doc = await services.createDocument({
    patientId,
    professionalId: resolvedProfessionalId,
    title: body.title,
    description: body.description,
    documentType: body.documentType,
    medicalRecordId: body.medicalRecordId,
    appointmentId: body.appointmentId,
    fileKey: key,
    fileMetadata: {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    },
  })

  const accessUrl = await storage.getAccessUrl(key)

  res.status(201).json({ ...doc, accessUrl })
}

export async function getDocumentController(req: Request, res: Response) {
  const { id } = req.params
  const doc = await services.getDocumentById(Number(id))

  if (!doc) {
    throw new AppError(404, 'Documento não encontrado')
  }

  const user = req.user!
  if (user.role === 'patient') {
    const patient = await services.getPatientByUserId(user.id)
    if (!patient || doc.patientId !== patient.id) {
      throw new AppError(403, 'Acesso negado a este documento')
    }
  }

  let accessUrl: string | null = null
  if (doc.fileUrl) {
    accessUrl = await storage.getAccessUrl(doc.fileUrl)
  }

  res.json({ ...doc, accessUrl })
}

export async function listMyDocumentsController(req: Request, res: Response) {
  const user = req.user!
  if (user.role !== 'patient') {
    throw new AppError(403, 'Apenas pacientes podem listar seus próprios documentos')
  }

  const patient = await services.getPatientByUserId(user.id)
  if (!patient) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const docs = await services.getDocumentsByPatient(patient.id)

  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      let accessUrl: string | null = null
      if (doc.fileUrl) {
        accessUrl = await storage.getAccessUrl(doc.fileUrl)
      }
      return { ...doc, accessUrl }
    }),
  )

  res.json(docsWithUrls)
}

export async function listPatientDocumentsController(req: Request, res: Response) {
  const user = req.user!
  if (user.role === 'patient') {
    throw new AppError(403, 'Use o endpoint /documents/me')
  }

  const patientId = Number(req.params.patientId)
  if (!Number.isFinite(patientId)) {
    throw new AppError(400, 'patientId inválido')
  }

  const docs = await services.getDocumentsByPatient(patientId)

  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      let accessUrl: string | null = null
      if (doc.fileUrl) {
        accessUrl = await storage.getAccessUrl(doc.fileUrl)
      }
      return { ...doc, accessUrl }
    }),
  )

  res.json(docsWithUrls)
}

export async function deleteDocumentController(req: Request, res: Response) {
  const { id } = req.params
  const doc = await services.getDocumentById(Number(id))

  if (!doc) {
    throw new AppError(404, 'Documento não encontrado')
  }

  const user = req.user!
  if (user.role === 'patient') {
    const patient = await services.getPatientByUserId(user.id)
    if (!patient || doc.patientId !== patient.id) {
      throw new AppError(403, 'Acesso negado')
    }
  }

  if (doc.fileUrl) {
    await storage.delete(doc.fileUrl).catch(() => {})
  }

  await services.deleteDocument(Number(id))
  res.status(204).send()
}

export async function archiveDocumentController(req: Request, res: Response) {
  const { id } = req.params
  const doc = await services.getDocumentById(Number(id))

  if (!doc) {
    throw new AppError(404, 'Documento não encontrado')
  }

  const user = req.user!
  if (user.role === 'patient') {
    const patient = await services.getPatientByUserId(user.id)
    if (!patient || doc.patientId !== patient.id) {
      throw new AppError(403, 'Acesso negado a este documento')
    }
  }

  const body = parseBody(archiveDocumentSchema, req.body)

  const updated = await services.archiveDocument(Number(id), body.isArchived)

  res.json(updated)
}

export async function updateDocumentController(req: Request, res: Response) {
  const { id } = req.params
  const doc = await services.getDocumentById(Number(id))

  if (!doc) {
    throw new AppError(404, 'Documento não encontrado')
  }

  const body = parseBody(updateDocumentSchema, req.body)

  const [updated] = await db
    .update(documents)
    .set({
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, Number(id)))
    .returning()

  res.json(updated)
}

export async function uploadFromUrlController(req: Request, res: Response) {
  const user = req.user!
  const body = parseBody(uploadFromUrlSchema, req.body)

  const patientId = await resolvePatientId(user.id, user.role, body.patientId)

  let resolvedProfessionalId: number | null = null
  if (user.role === 'professional') {
    const prof = await services.getProfessionalByUserId(user.id)
    if (prof) resolvedProfessionalId = prof.id
  }

  const response = await fetch(body.url)
  if (!response.ok) {
    throw new AppError(400, `Não foi possível acessar a URL (status ${response.status})`)
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream'
  const buffer = Buffer.from(await response.arrayBuffer())

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(400, `Tipo de arquivo não permitido: ${contentType}`)
  }

  const MAX_SIZE = 20 * 1024 * 1024
  if (buffer.length > MAX_SIZE) {
    throw new AppError(400, `Arquivo muito grande (máx. 20MB). Este tem ${(buffer.length / 1024 / 1024).toFixed(1)}MB`)
  }

  const urlParts = body.url.split('/')
  const originalName = urlParts[urlParts.length - 1] || 'documento'

  const { key } = await storage.upload(
    { buffer, mimetype: contentType, originalName, size: buffer.length },
    `patients/${patientId}`,
  )

  const doc = await services.createDocument({
    patientId,
    professionalId: resolvedProfessionalId,
    title: body.title,
    description: body.description,
    documentType: body.documentType,
    fileKey: key,
    fileMetadata: { originalName, mimetype: contentType, size: buffer.length },
  })

  const accessUrl = await storage.getAccessUrl(key)
  res.status(201).json({ ...doc, accessUrl })
}

export async function uploadFromDriveController(req: Request, res: Response) {
  const user = req.user!
  const body = parseBody(uploadFromDriveSchema, req.body)

  const patientId = await resolvePatientId(user.id, user.role, body.patientId)

  let resolvedProfessionalId: number | null = null
  if (user.role === 'professional') {
    const prof = await services.getProfessionalByUserId(user.id)
    if (prof) resolvedProfessionalId = prof.id
  }

  const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY

  let driveResponse
  if (accessToken) {
    driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${body.googleFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  } else if (apiKey) {
    driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${body.googleFileId}?alt=media&key=${apiKey}`,
    )
  } else {
    throw new AppError(400, 'Google Drive não configurado. Defina GOOGLE_DRIVE_ACCESS_TOKEN ou GOOGLE_DRIVE_API_KEY no .env')
  }

  if (!driveResponse.ok) {
    throw new AppError(400, `Erro ao baixar arquivo do Google Drive (status ${driveResponse.status})`)
  }

  const buffer = Buffer.from(await driveResponse.arrayBuffer())

  const MAX_SIZE = 20 * 1024 * 1024
  if (buffer.length > MAX_SIZE) {
    throw new AppError(400, `Arquivo muito grande (máx. 20MB). Este tem ${(buffer.length / 1024 / 1024).toFixed(1)}MB`)
  }

  const { key } = await storage.upload(
    { buffer, mimetype: body.googleMimeType, originalName: body.googleFileName, size: buffer.length },
    `patients/${patientId}`,
  )

  const doc = await services.createDocument({
    patientId,
    professionalId: resolvedProfessionalId,
    title: body.title,
    description: body.description,
    documentType: body.documentType,
    fileKey: key,
    fileMetadata: { originalName: body.googleFileName, mimetype: body.googleMimeType, size: buffer.length },
  })

  const accessUrl = await storage.getAccessUrl(key)
  res.status(201).json({ ...doc, accessUrl })
}
