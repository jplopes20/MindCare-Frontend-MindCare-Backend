import type { Request, Response } from 'express'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  specialties,
  workingHours,
  appointments,
  patients,
  healthProfessionals,
  users,
} from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import {
  createSpecialtySchema,
  updateSpecialtySchema,
  createWorkingHoursSchema,
  updateWorkingHoursSchema,
  createAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  sendAppointmentMessageSchema,
  rejectRescheduleSchema,
} from './schemas.js'
import * as services from './services.js'
import { emailService } from '../email/email.service.js'

// ============================================================================
// SPECIALTIES CONTROLLERS
// ============================================================================

export async function createSpecialtyController(req: Request, res: Response) {
  const body = parseBody(createSpecialtySchema, req.body)
  const [specialty] = await db
    .insert(specialties)
    .values({
      name: body.name,
      description: body.description,
    })
    .returning()
  res.status(201).json(specialty)
}

export async function getSpecialtiesController(req: Request, res: Response) {
  const list = await db.select().from(specialties)
  res.json(list)
}

export async function getSpecialtyByIdController(req: Request, res: Response) {
  const { id } = req.params
  const [specialty] = await db
    .select()
    .from(specialties)
    .where(eq(specialties.id, Number(id)))
  if (!specialty) {
    throw new AppError(404, 'Especialidade não encontrada')
  }
  res.json(specialty)
}

export async function updateSpecialtyController(
  req: Request,
  res: Response,
) {
  const { id } = req.params
  const body = parseBody(updateSpecialtySchema, req.body)
  const [specialty] = await db
    .update(specialties)
    .set(body)
    .where(eq(specialties.id, Number(id)))
    .returning()
  if (!specialty) {
    throw new AppError(404, 'Especialidade não encontrada')
  }
  res.json(specialty)
}

export async function deleteSpecialtyController(req: Request, res: Response) {
  const { id } = req.params
  const result = await db
    .delete(specialties)
    .where(eq(specialties.id, Number(id)))
  res.status(204).send()
}

// ============================================================================
// WORKING_HOURS CONTROLLERS
// ============================================================================

/**
 * Valida sobreposição de horários
 */
async function validateNoOverlap(
  professionalId: number,
  weekday: number,
  startTime: string,
  endTime: string,
  excludeId?: number,
) {
  const existing = await db
    .select()
    .from(workingHours)
    .where(
      and(
        eq(workingHours.healthProfessionalId, professionalId),
        eq(workingHours.weekday, weekday),
      ),
    )

  for (const wh of existing) {
    if (excludeId && wh.id === excludeId) continue

    const startParts = startTime.split(':').map(Number)
    const endParts = endTime.split(':').map(Number)
    const whStartParts = wh.startTime.split(':').map(Number)
    const whEndParts = wh.endTime.split(':').map(Number)

    const sHour = startParts[0]!
    const sMin = startParts[1]!
    const eHour = endParts[0]!
    const eMin = endParts[1]!
    const exSHour = whStartParts[0]!
    const exSMin = whStartParts[1]!
    const exEHour = whEndParts[0]!
    const exEMin = whEndParts[1]!

    const newStart = sHour * 60 + sMin
    const newEnd = eHour * 60 + eMin
    const existStart = exSHour * 60 + exSMin
    const existEnd = exEHour * 60 + exEMin

    if (!(newEnd <= existStart || newStart >= existEnd)) {
      throw new AppError(400, 'Horários se sobrepõem')
    }
  }
}

export async function createWorkingHoursController(
  req: Request,
  res: Response,
) {
  const body = parseBody(createWorkingHoursSchema, req.body)

  // Busca o profissional pelo userId
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const professionalId = profList[0]!.id

  // Valida sobreposição
  await validateNoOverlap(
    professionalId,
    body.weekday,
    body.startTime,
    body.endTime,
  )

  const [wh] = await db
    .insert(workingHours)
    .values({
      healthProfessionalId: professionalId,
      weekday: body.weekday,
      startTime: body.startTime,
      endTime: body.endTime,
      isActive: body.isActive,
    })
    .returning()

  res.status(201).json(wh)
}

export async function getMyWorkingHoursController(req: Request, res: Response) {
  // Busca o profissional pelo userId
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const list = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.healthProfessionalId, profList[0]!.id))

  res.json(list)
}

export async function getProfessionalWorkingHoursController(
  req: Request,
  res: Response,
) {
  const { professionalId } = req.params
  const list = await db
    .select()
    .from(workingHours)
    .where(
      eq(workingHours.healthProfessionalId, Number(professionalId)),
    )

  res.json(list)
}

export async function updateWorkingHoursController(
  req: Request,
  res: Response,
) {
  const { id } = req.params
  const body = parseBody(updateWorkingHoursSchema, req.body)

  const [existing] = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.id, Number(id)))

  if (!existing) {
    throw new AppError(404, 'Horário de trabalho não encontrado')
  }

  if (body.weekday !== undefined || body.startTime || body.endTime) {
    await validateNoOverlap(
      existing.healthProfessionalId,
      body.weekday ?? existing.weekday,
      body.startTime ?? existing.startTime,
      body.endTime ?? existing.endTime,
      Number(id),
    )
  }

  const [updated] = await db
    .update(workingHours)
    .set(body)
    .where(eq(workingHours.id, Number(id)))
    .returning()

  res.json(updated)
}

export async function deleteWorkingHoursController(
  req: Request,
  res: Response,
) {
  const { id } = req.params
  await db.delete(workingHours).where(eq(workingHours.id, Number(id)))
  res.status(204).send()
}

// ============================================================================
// APPOINTMENTS CONTROLLERS
// ============================================================================

export async function createAppointmentController(req: Request, res: Response) {
  const body = parseBody(createAppointmentSchema, req.body)

  const [patientRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, req.user!.id))
  if (!patientRow) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const appointment = await services.requestAppointment(patientRow.id, body)

  services
    .getProfessionalById(body.professionalId, true)
    .then((prof: any) => {
      if (!prof?.user) return
      const dateTime = new Date(body.scheduledStartTime).toLocaleString('pt-BR')
      emailService.sendAppointmentRequest({
        to: prof.user.email,
        professionalName: prof.user.email,
        patientName: req.user!.email,
        dateTime,
      })
    })
    .catch((err: unknown) =>
      console.error('[Email] Failed to send request notification:', err),
    )

  res.status(201).json(appointment)
}

export async function getAppointmentController(req: Request, res: Response) {
  const { id } = req.params
  const apt = await services.getAppointmentById(Number(id))
  if (!apt) {
    throw new AppError(404, 'Consulta não encontrada')
  }
  res.json(apt)
}

export async function getMyAppointmentsController(req: Request, res: Response) {
  // Se paciente, retorna suas consultas. Se profissional, retorna agendadas com ele
  let apts: any[]

  if (req.user!.role === 'patient') {
    // Busca paciente pelo userId
    const patientList = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, req.user!.id))

    if (patientList.length === 0) {
      throw new AppError(404, 'Perfil de paciente não encontrado')
    }

    apts = await services.getAppointmentsByPatient(patientList[0]!.id)
  } else if (req.user!.role === 'professional') {
    // Busca profissional pelo userId
    const profList = await db
      .select()
      .from(healthProfessionals)
      .where(eq(healthProfessionals.userId, req.user!.id))

    if (profList.length === 0) {
      throw new AppError(404, 'Perfil de profissional não encontrado')
    }

    apts = await services.getAppointmentsByProfessional(profList[0]!.id)
  } else {
    throw new AppError(403, 'Acesso negado')
  }

  res.json(apts)
}

export async function cancelAppointmentController(
  req: Request,
  res: Response,
) {
  const { id } = req.params
  const body = parseBody(cancelAppointmentSchema, req.body)

  const role = req.user!.role
  if (role !== 'patient' && role !== 'professional' && role !== 'admin') {
    throw new AppError(403, 'Apenas pacientes, profissionais ou admins podem cancelar')
  }

  const updated = await services.cancelAppointment(
    Number(id),
    body,
    role,
    req.user!.id,
  )

  if (updated) {
    services
      .getAppointmentById(Number(id))
      .then(async (apt) => {
        if (!apt) return
        const [patientRow] = await db
          .select()
          .from(patients)
          .where(eq(patients.id, apt.patientId))
        if (!patientRow) return
        const [patientUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, patientRow.userId))
        if (!patientUser) return
        const prof: any = await services.getProfessionalById(apt.professionalId, true)
        if (!prof?.user) return

        const dateTime = apt.scheduledStartTime.toLocaleString('pt-BR')
        emailService.sendCancellationNotice({
          to: patientUser.email,
          patientName: patientUser.email,
          professionalName: prof.user.email,
          dateTime,
          reason: body.cancellationReason,
        })
      })
      .catch((err: unknown) =>
        console.error('[Email] Failed to send cancellation notice:', err),
      )
  }

  res.json(updated)
}

export async function getAvailableSlotsController(
  req: Request,
  res: Response,
) {
  const { professionalId, date } = req.query

  if (!professionalId || !date) {
    throw new AppError(400, 'professionalId e date são obrigatórios')
  }

  const slots = await services.getAvailableSlots(
    Number(professionalId),
    String(date),
  )

  res.json({ slots, professionalId, date })
}

// ============================================================================
// NEGOTIATION / CONFIRMATION CONTROLLERS
// ============================================================================

export async function confirmAppointmentController(req: Request, res: Response) {
  const { id } = req.params
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))
  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const updated = await services.confirmAppointment(Number(id), profList[0]!.id)

  // Notify patient
  services.getAppointmentById(Number(id)).then(async (apt) => {
    if (!apt) return
    const [patientRow] = await db.select().from(patients).where(eq(patients.id, apt.patientId))
    if (!patientRow) return
    const [patientUser] = await db.select().from(users).where(eq(users.id, patientRow.userId))
    const prof: any = await services.getProfessionalById(apt.professionalId, true)
    if (!prof?.user || !patientUser) return
    const dateTime = apt.scheduledStartTime.toLocaleString('pt-BR')
    emailService.sendAppointmentConfirmed({
      to: patientUser.email,
      patientName: patientUser.email,
      professionalName: prof.user.email,
      dateTime,
    })
  }).catch((err) => console.error('[Email] Failed:', err))

  res.json(updated)
}

export async function rescheduleAppointmentController(req: Request, res: Response) {
  const { id } = req.params
  const body = parseBody(rescheduleAppointmentSchema, req.body)

  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))
  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const updated = await services.rescheduleAppointment(
    Number(id),
    profList[0]!.id,
    body.scheduledStartTime,
    body.scheduledEndTime,
    body.message,
  )

  // Notify patient
  services.getAppointmentById(Number(id)).then(async (apt) => {
    if (!apt) return
    const [patientRow] = await db.select().from(patients).where(eq(patients.id, apt.patientId))
    if (!patientRow) return
    const [patientUser] = await db.select().from(users).where(eq(users.id, patientRow.userId))
    const prof: any = await services.getProfessionalById(apt.professionalId, true)
    if (!prof?.user || !patientUser) return
    const newDate = new Date(body.scheduledStartTime).toLocaleString('pt-BR')
    emailService.sendRescheduleProposal({
      to: patientUser.email,
      patientName: patientUser.email,
      professionalName: prof.user.email,
      dateTime: newDate,
      message: body.message || '',
    })
  }).catch((err) => console.error('[Email] Failed:', err))

  res.json(updated)
}

export async function acceptRescheduleController(req: Request, res: Response) {
  const { id } = req.params
  const [patientRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, req.user!.id))
  if (!patientRow) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const updated = await services.acceptReschedule(Number(id), patientRow.id)

  services.getAppointmentById(Number(id)).then(async (apt) => {
    if (!apt) return
    const prof: any = await services.getProfessionalById(apt.professionalId, true)
    if (!prof?.user) return
    const dateTime = apt.scheduledStartTime.toLocaleString('pt-BR')
    emailService.sendAppointmentConfirmed({
      to: req.user!.email,
      patientName: req.user!.email,
      professionalName: prof.user.email,
      dateTime,
    })
  }).catch((err) => console.error('[Email] Failed:', err))

  res.json(updated)
}

export async function rejectRescheduleController(req: Request, res: Response) {
  const { id } = req.params
  const body = parseBody(rejectRescheduleSchema, req.body)

  const [patientRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, req.user!.id))
  if (!patientRow) {
    throw new AppError(404, 'Perfil de paciente não encontrado')
  }

  const updated = await services.rejectReschedule(Number(id), patientRow.id, body.message)

  res.json(updated)
}

export async function sendMessageController(req: Request, res: Response) {
  const { id } = req.params
  const body = parseBody(sendAppointmentMessageSchema, req.body)

  const msg = await services.sendAppointmentMessage(Number(id), req.user!.id, body.message)

  // Emit Socket.io event if available
  const io = req.app.get('io')
  if (io) {
    io.to(`appointment:${id}`).emit('appointment:message', msg)
  }

  res.status(201).json(msg)
}

export async function getMessagesController(req: Request, res: Response) {
  const { id } = req.params
  const messages = await services.getAppointmentMessages(Number(id), req.user!.id)
  res.json(messages)
}
