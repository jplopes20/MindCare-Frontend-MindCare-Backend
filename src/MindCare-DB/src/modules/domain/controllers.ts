import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  users,
  patients,
  healthProfessionals,
} from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import { decryptFields } from '../../shared/crypto.js'
import {
  createPatientSchema,
  updatePatientSchema,
  createHealthProfessionalSchema,
  updateHealthProfessionalSchema,
  createReportSchema,
  updateReportSchema,
  linkPatientSchema,
} from './schemas.js'
import * as services from './services.js'

// ============================================================================
// PATIENTS CONTROLLERS
// ============================================================================

export async function createPatientController(req: Request, res: Response) {
  const body = parseBody(createPatientSchema, req.body)
  const patient = await services.createPatient(req.user!.id, body)
  res.status(201).json(patient)
}

export async function getMyPatientProfileController(
  req: Request,
  res: Response,
) {
  const row = await db.query.patients.findFirst({
    where: eq(patients.userId, req.user!.id),
    with: { user: true },
  })
  if (!row) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }
  res.json(decryptFields(row, ['cpf', 'phone', 'address']))
}

export async function getPatientByIdController(req: Request, res: Response) {
  const { id } = req.params
  const patient = await services.getPatientById(Number(id))
  if (!patient) {
    throw new AppError(404, 'Paciente não encontrado')
  }
  res.json(patient)
}

export async function updateMyPatientProfileController(
  req: Request,
  res: Response,
) {
  const body = parseBody(updatePatientSchema, req.body)
  const patient = await services.getPatientByUserId(req.user!.id)
  if (!patient) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }
  const updated = await services.updatePatient(patient.id, body)
  res.json(updated)
}

export async function deletePatientController(req: Request, res: Response) {
  const { id } = req.params
  await services.deletePatient(Number(id))
  res.status(204).send()
}

export async function getAllPatientsController(req: Request, res: Response) {
  const searchTerm = req.query.search as string | undefined
  if (searchTerm) {
    const results = await services.getAllPatients(searchTerm)
    res.json(results)
    return
  }
  const rows = await db.query.patients.findMany({
    with: {
      user: true,
    },
  })
  res.json(rows.map((r) => decryptFields(r, ['cpf', 'phone', 'address'])))
}

// ============================================================================
// HEALTH_PROFESSIONALS CONTROLLERS
// ============================================================================

export async function createHealthProfessionalController(
  req: Request,
  res: Response,
) {
  const body = parseBody(createHealthProfessionalSchema, req.body)
  const professional = await services.createHealthProfessional(req.user!.id, body)
  res.status(201).json(professional)
}

export async function getMyProfessionalProfileController(
  req: Request,
  res: Response,
) {
  const professional = await services.getProfessionalByUserId(req.user!.id)
  if (!professional) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }
  const withDetails = await services.getProfessionalById(professional.id, true)
  res.json(withDetails)
}

export async function getProfessionalByIdController(
  req: Request,
  res: Response,
) {
  const { id } = req.params
  const professional = await services.getProfessionalById(Number(id), true)
  if (!professional) {
    throw new AppError(404, 'Profissional não encontrado')
  }
  res.json(professional)
}

export async function updateMyProfessionalProfileController(
  req: Request,
  res: Response,
) {
  const body = parseBody(updateHealthProfessionalSchema, req.body)
  const professional = await services.getProfessionalByUserId(req.user!.id)
  if (!professional) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }
  const updated = await services.updateHealthProfessional(
    professional.id,
    body,
  )
  res.json(updated)
}

export async function deleteProfessionalController(
  req: Request,
  res: Response,
) {
  const { id } = req.params
  await services.deleteHealthProfessional(Number(id))
  res.status(204).send()
}

export async function getAllProfessionalsController(
  req: Request,
  res: Response,
) {
  const professionals = await services.getAllProfessionals()
  res.json(professionals)
}

export async function getMyPatientsController(req: Request, res: Response) {
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const professionalId = profList[0]!.id
  const linkedPatients = await services.getLinkedPatientsByProfessional(
    professionalId,
  )

  if (linkedPatients.length === 0) {
    console.log(
      `[Patients] Nenhum paciente vinculado encontrado para profissional ${professionalId}, retornando todos`,
    )
    const allPatients = await services.getAllPatients()
    res.json(allPatients)
    return
  }

  res.json(linkedPatients)
}

export async function getAllPatientsForProfessionalController(
  req: Request,
  res: Response,
) {
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const searchTerm = req.query.search as string | undefined
  const allPatients = await services.getAllPatients(searchTerm)
  res.json(allPatients)
}

export async function linkPatientController(req: Request, res: Response) {
  const body = parseBody(linkPatientSchema, req.body)

  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const link = await services.linkPatient(
    profList[0]!.id,
    body.patientId,
  )
  res.status(201).json(link)
}

// ============================================================================
// PROFESSIONAL SUMMARY CONTROLLER
// ============================================================================

export async function getProfessionalSummaryController(
  req: Request,
  res: Response,
) {
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const summary = await services.getProfessionalSummary(profList[0]!.id)
  res.json(summary)
}

// ============================================================================
// REPORTS CONTROLLERS
// ============================================================================

export async function createReportController(req: Request, res: Response) {
  const body = parseBody(createReportSchema, req.body)

  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const report = await services.createReport(profList[0]!.id, body)
  res.status(201).json(report)
}

export async function listReportsController(req: Request, res: Response) {
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const reportsList = await services.getReportsByProfessional(profList[0]!.id)
  res.json(reportsList)
}

export async function updateReportController(req: Request, res: Response) {
  const body = parseBody(updateReportSchema, req.body)
  const { id } = req.params

  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const report = await services.updateReport(
    Number(id),
    profList[0]!.id,
    body,
  )
  res.json(report)
}

export async function deleteReportController(req: Request, res: Response) {
  const { id } = req.params

  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  await services.deleteReport(Number(id), profList[0]!.id)
  res.status(204).send()
}
