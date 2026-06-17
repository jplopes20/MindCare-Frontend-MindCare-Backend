import { eq, and, gte, desc, or, ilike, asc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  patients,
  healthProfessionals,
  users,
  specialties,
  appointments,
  appointmentMessages,
  workingHours,
  medicalRecords,
  diagnoses,
  prescriptions,
  documents,
  emotionLogs,
  professionalPatients,
  reports,
} from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import {
  cacheAvailableSlots,
  getAvailableSlotsFromCache,
  invalidateAvailableSlotsCache,
  invalidateAllProfessionalSlots,
} from '../../shared/redis.js'
import type {
  CreatePatient,
  UpdatePatient,
  CreateHealthProfessional,
  CreateAppointment,
  CancelAppointment,
  CreateDocument,
  UpdateDocument,
  CreateEmotionLog,
  CreateReport,
  UpdateReport,
} from './schemas.js'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Verifica se o erro é uma violação de constraint UNIQUE do PostgreSQL.
 * O PostgresError fica aninhado dentro do DrizzleQueryError na propriedade `cause`.
 */
function isPgUniqueViolation(err: unknown, constraintName?: string): boolean {
  const cause =
    typeof err === 'object' && err !== null && 'cause' in err
      ? (err as { cause: unknown }).cause
      : err
  if (typeof cause !== 'object' || cause === null) return false
  const pgErr = cause as { code?: string; constraint_name?: string; constraint?: string }
  if (pgErr.code !== '23505') return false
  if (constraintName !== undefined) {
    return pgErr.constraint_name === constraintName || pgErr.constraint === constraintName
  }
  return true
}

// ============================================================================
// PATIENTS
// ============================================================================

export async function createPatient(userId: number, data: CreatePatient) {
  // 1. Verifica se já existe um paciente para este userId (auto-criado no registro)
  const existing = await getPatientByUserId(userId)

  if (existing) {
    // 2. Se existe, atualiza os campos fornecidos
    return updatePatient(existing.id, data)
  }

  // 3. Se não existe, tenta criar novo
  try {
    const [patient] = await db
      .insert(patients)
      .values({
        userId,
        name: data.name,
        cpf: data.cpf,
        dateOfBirth: data.dateOfBirth
          ? new Date(data.dateOfBirth)
          : undefined,
        phone: data.phone,
        address: data.address,
      })
      .returning()

    return patient
  } catch (err: unknown) {
    if (isPgUniqueViolation(err, 'patients_cpf_key')) {
      throw new AppError(409, 'CPF já cadastrado para outro paciente')
    }
    throw err
  }
}

export async function getPatientByUserId(userId: number) {
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, userId))

  return patient
}

export async function getPatientById(patientId: number) {
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))

  return patient
}

export async function updatePatient(patientId: number, data: UpdatePatient) {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.cpf !== undefined) updateData.cpf = data.cpf
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth)
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address
  updateData.updatedAt = new Date()

  try {
    const [patient] = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId))
      .returning()

    return patient
  } catch (err: unknown) {
    if (isPgUniqueViolation(err, 'patients_cpf_key')) {
      throw new AppError(409, 'CPF já cadastrado para outro paciente')
    }
    throw err
  }
}

export async function deletePatient(patientId: number) {
  await db.delete(patients).where(eq(patients.id, patientId))
}

// ============================================================================
// HEALTH_PROFESSIONALS
// ============================================================================

export async function createHealthProfessional(
  userId: number,
  data: CreateHealthProfessional,
) {
  // Verifica se specialty existe
  const specialty = await db.query.specialties.findFirst({
    where: (sp) => eq(sp.id, data.specialtyId),
  })

  if (!specialty) {
    throw new AppError(404, 'Specialty não encontrada')
  }

  const [professional] = await db
    .insert(healthProfessionals)
    .values({
      userId,
      crm: data.crm,
      specialtyId: data.specialtyId,
      licenseExpiry: data.licenseExpiry
        ? new Date(data.licenseExpiry)
        : undefined,
      bio: data.bio,
    })
    .returning()

  return professional
}

export async function getProfessionalByUserId(userId: number) {
  const [professional] = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, userId))

  return professional
}

export async function getProfessionalById(
  professionalId: number,
  withUser = false,
) {
  if (withUser) {
    const professional = await db.query.healthProfessionals.findFirst({
      where: eq(healthProfessionals.id, professionalId),
      with: {
        user: true,
        specialty: true,
      },
    })
    return professional
  }

  const [professional] = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.id, professionalId))

  return professional
}

export async function getAllProfessionals() {
  return db.query.healthProfessionals.findMany({
    with: {
      user: true,
      specialty: true,
    },
  })
}

export async function updateHealthProfessional(
  professionalId: number,
  data: Partial<CreateHealthProfessional>,
) {
  const [professional] = await db
    .update(healthProfessionals)
    .set({
      crm: data.crm,
      specialtyId: data.specialtyId,
      licenseExpiry: data.licenseExpiry
        ? new Date(data.licenseExpiry)
        : undefined,
      bio: data.bio,
      updatedAt: new Date(),
    })
    .where(eq(healthProfessionals.id, professionalId))
    .returning()

  return professional
}

export async function deleteHealthProfessional(professionalId: number) {
  await db
    .delete(healthProfessionals)
    .where(eq(healthProfessionals.id, professionalId))
}

// ============================================================================
// APPOINTMENTS - Verificação de disponibilidade e cancelamento
// ============================================================================

/**
 * Calcula diferença em horas entre duas datas
 */
function getHoursDifference(from: Date, to: Date): number {
  return Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60)
}

/**
 * Verifica se pode cancelar uma consulta (mínimo 24h antes)
 * Se < 24h: marca com penalidade
 */
export function validateCancellation(
  scheduledStartTime: Date,
): { canCancel: boolean; hasPenalty: boolean } {
  const now = new Date()
  const hoursDiff = getHoursDifference(now, scheduledStartTime)

  if (scheduledStartTime < now) {
    return { canCancel: false, hasPenalty: true } // Já passou
  }

  return {
    canCancel: true,
    hasPenalty: hoursDiff < 24, // Penalidade se < 24h
  }
}

/**
 * Função de disponibilidade: retorna slots livres de um profissional em uma data
 * Usa working_hours e appointments agendadas para calcular
 */
export async function getAvailableSlots(
  professionalId: number,
  dateStr: string, // formato: YYYY-MM-DD
  slotDurationMinutes = 30,
) {
  // 1. Tenta buscar do cache
  const cachedSlots = await getAvailableSlotsFromCache(
    professionalId,
    dateStr,
  )
  if (cachedSlots) {
    console.log(
      `[Cache] Slots retornados do cache para prof ${professionalId}`,
    )
    return cachedSlots
  }

  // Parse date parts manually to avoid timezone shift (e.g. "2026-05-13" → UTC midnight → local previous day)
  const parts = dateStr.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (y === undefined || m === undefined || d === undefined) {
    throw new AppError(400, 'Formato de data inválido. Use YYYY-MM-DD')
  }
  const date = new Date(y, m - 1, d)
  const weekday = date.getDay()

  // 2. Busca horários de funcionamento do profissional neste dia
  const workingHoursForDay = await db
    .select()
    .from(workingHours)
    .where(
      and(
        eq(workingHours.healthProfessionalId, professionalId),
        eq(workingHours.weekday, weekday),
        eq(workingHours.isActive, true),
      ),
    )

  if (workingHoursForDay.length === 0) {
    return [] // Profissional não trabalha neste dia
  }

  // 3. Busca appointments agendadas (não canceladas) neste dia
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const appointmentsOnDay = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.professionalId, professionalId),
        eq(appointments.status, 'scheduled'),
        // scheduledStartTime entre dayStart e dayEnd
      ),
    )

  // 4. Gera slots disponíveis
  const slots: { startTime: Date; endTime: Date }[] = []

  for (const wh of workingHoursForDay) {
    const startParts = wh.startTime.split(':').map(Number)
    const endParts = wh.endTime.split(':').map(Number)
    const startHour = startParts[0]!
    const startMin = startParts[1]!
    const endHour = endParts[0]!
    const endMin = endParts[1]!

    let slotStart = new Date(date)
    slotStart.setHours(startHour, startMin, 0, 0)
    const dayEndTime = new Date(date)
    dayEndTime.setHours(endHour, endMin, 0, 0)

    while (slotStart < dayEndTime) {
      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes)

      // Verifica se conflita com appointments
      const hasConflict = appointmentsOnDay.some(
        (apt) =>
          !(slotEnd <= apt.scheduledStartTime) &&
          !(slotStart >= apt.scheduledEndTime),
      )

      if (!hasConflict) {
        slots.push({ startTime: slotStart, endTime: slotEnd })
      }

      slotStart = slotEnd
    }
  }

  // 5. Armazena no cache
  await cacheAvailableSlots(professionalId, dateStr, slots)

  return slots
}

export async function requestAppointment(
  patientId: number,
  data: CreateAppointment,
) {
  const startTime = new Date(data.scheduledStartTime)
  const endTime = new Date(data.scheduledEndTime)

  if (startTime >= endTime) {
    throw new AppError(400, 'Data/hora de término deve ser maior que a de início')
  }

  if (startTime < new Date()) {
    throw new AppError(400, 'Não pode agendar no passado')
  }

  const dateStr = data.scheduledStartTime.split('T')[0]!
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  const weekday = date.getDay()

  const profHours = await db
    .select()
    .from(workingHours)
    .where(
      and(
        eq(workingHours.healthProfessionalId, data.professionalId),
        eq(workingHours.weekday, weekday),
        eq(workingHours.isActive, true),
      ),
    )

  if (profHours.length === 0) {
    throw new AppError(400, 'O profissional não atende neste dia da semana')
  }

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

  const withinWorkingHours = profHours.some((wh) => {
    const whStart = Number(wh.startTime.split(':')[0]) * 60 + Number(wh.startTime.split(':')[1])
    const whEnd = Number(wh.endTime.split(':')[0]) * 60 + Number(wh.endTime.split(':')[1])
    return startMinutes >= whStart && endMinutes <= whEnd
  })

  if (!withinWorkingHours) {
    throw new AppError(400, 'O horário solicitado está fora do expediente do profissional')
  }

  const slots = await getAvailableSlots(data.professionalId, dateStr)

  const isAvailable = slots.some(
    (slot) => slot.startTime <= startTime && endTime <= slot.endTime,
  )

  if (!isAvailable) {
    throw new AppError(400, 'Horário indisponível — já existe consulta agendada neste horário')
  }

  const [appointment] = await db
    .insert(appointments)
    .values({
      patientId,
      professionalId: data.professionalId,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      status: 'requested',
      requestedAt: new Date(),
    })
    .returning()

  return appointment
}

export async function confirmAppointment(appointmentId: number, professionalId: number) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) throw new AppError(404, 'Consulta não encontrada')
  if (appointment.professionalId !== professionalId) {
    throw new AppError(403, 'Você só pode confirmar suas próprias consultas')
  }
  if (appointment.status !== 'requested' && appointment.status !== 'rescheduled') {
    throw new AppError(400, 'Apenas consultas solicitadas ou reagendadas podem ser confirmadas')
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  const dateStr = appointment.scheduledStartTime.toISOString().split('T')[0]!
  await invalidateAvailableSlotsCache(appointment.professionalId, dateStr)
  await linkPatientToProfessional(appointment.professionalId, appointment.patientId)

  return updated
}

export async function rescheduleAppointment(
  appointmentId: number,
  professionalId: number,
  newStart: string,
  newEnd: string,
  message?: string,
) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) throw new AppError(404, 'Consulta não encontrada')
  if (appointment.professionalId !== professionalId) {
    throw new AppError(403, 'Você só pode reagendar suas próprias consultas')
  }
  if (appointment.status !== 'requested' && appointment.status !== 'confirmed') {
    throw new AppError(400, 'Apenas consultas solicitadas ou confirmadas podem ser reagendadas')
  }

  const proposedStart = new Date(newStart)
  const proposedEnd = new Date(newEnd)

  if (proposedStart >= proposedEnd) {
    throw new AppError(400, 'Data/hora de término deve ser maior que a de início')
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: 'rescheduled',
      proposedStartTime: proposedStart,
      proposedEndTime: proposedEnd,
      negotiationNotes: message || null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  return updated
}

export async function acceptReschedule(appointmentId: number, patientId: number) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) throw new AppError(404, 'Consulta não encontrada')
  if (appointment.patientId !== patientId) {
    throw new AppError(403, 'Você só pode aceitar reagendamentos das suas próprias consultas')
  }
  if (appointment.status !== 'rescheduled') {
    throw new AppError(400, 'Apenas consultas com proposta de reagendamento podem ser aceitas')
  }
  if (!appointment.proposedStartTime || !appointment.proposedEndTime) {
    throw new AppError(400, 'Nenhuma proposta de reagendamento encontrada')
  }

  const oldDateStr = appointment.scheduledStartTime.toISOString().split('T')[0]!

  const [updated] = await db
    .update(appointments)
    .set({
      status: 'confirmed',
      scheduledStartTime: appointment.proposedStartTime,
      scheduledEndTime: appointment.proposedEndTime,
      proposedStartTime: null,
      proposedEndTime: null,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  const newDateStr = updated.scheduledStartTime.toISOString().split('T')[0]!
  await invalidateAvailableSlotsCache(appointment.professionalId, oldDateStr)
  if (newDateStr !== oldDateStr) {
    await invalidateAvailableSlotsCache(appointment.professionalId, newDateStr)
  }
  await linkPatientToProfessional(appointment.professionalId, appointment.patientId)

  return updated
}

export async function rejectReschedule(appointmentId: number, patientId: number, message?: string) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) throw new AppError(404, 'Consulta não encontrada')
  if (appointment.patientId !== patientId) {
    throw new AppError(403, 'Você só pode recusar reagendamentos das suas próprias consultas')
  }
  if (appointment.status !== 'rescheduled') {
    throw new AppError(400, 'Apenas consultas com proposta de reagendamento podem ser recusadas')
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: 'requested',
      proposedStartTime: null,
      proposedEndTime: null,
      negotiationNotes: message || null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  return updated
}

export async function sendAppointmentMessage(
  appointmentId: number,
  senderId: number,
  message: string,
) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) throw new AppError(404, 'Consulta não encontrada')

  const [msg] = await db
    .insert(appointmentMessages)
    .values({ appointmentId, senderId, message })
    .returning()

  return msg
}

export async function getAppointmentMessages(appointmentId: number, userId: number) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) throw new AppError(404, 'Consulta não encontrada')

  const user = await db.select().from(users).where(eq(users.id, userId))
  if (!user[0]) throw new AppError(404, 'Usuário não encontrado')

  const patient = await getPatientByUserId(userId)
  const prof = await getProfessionalByUserId(userId)

  const isPatient = patient && appointment.patientId === patient.id
  const isProfessional = prof && appointment.professionalId === prof.id

  if (!isPatient && !isProfessional && user[0]!.role !== 'admin') {
    throw new AppError(403, 'Acesso negado a estas mensagens')
  }

  return db
    .select()
    .from(appointmentMessages)
    .where(eq(appointmentMessages.appointmentId, appointmentId))
    .orderBy(appointmentMessages.createdAt)
}

export async function getAppointmentById(appointmentId: number) {
  return db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  })
}

export async function getAppointmentsByPatient(patientId: number) {
  return db.query.appointments.findMany({
    where: eq(appointments.patientId, patientId),
    with: {
      professional: {
        with: {
          user: true,
          specialty: true,
        },
      },
    },
    orderBy: appointments.scheduledStartTime,
  })
}

export async function getAppointmentsByProfessional(professionalId: number) {
  return db.query.appointments.findMany({
    where: eq(appointments.professionalId, professionalId),
    with: {
      patient: {
        with: {
          user: true,
        },
      },
    },
    orderBy: appointments.scheduledStartTime,
  })
}

export async function cancelAppointment(
  appointmentId: number,
  data: CancelAppointment,
  cancelledBy: 'patient' | 'professional' | 'admin',
  requesterUserId: number,
) {
  const appointment = await getAppointmentById(appointmentId)

  if (!appointment) {
    throw new AppError(404, 'Consulta não encontrada')
  }

  // Valida ownership: paciente só cancela própria consulta; profissional só a sua
  if (cancelledBy === 'patient') {
    const patient = await getPatientByUserId(requesterUserId)
    if (!patient || appointment.patientId !== patient.id) {
      throw new AppError(403, 'Você só pode cancelar suas próprias consultas')
    }
  } else if (cancelledBy === 'professional') {
    const prof = await getProfessionalByUserId(requesterUserId)
    if (!prof || appointment.professionalId !== prof.id) {
      throw new AppError(403, 'Você só pode cancelar consultas agendadas com você')
    }
  }

  if (appointment.status !== 'scheduled') {
    throw new AppError(400, 'Apenas consultas com status "agendada" podem ser canceladas')
  }

  const { canCancel, hasPenalty } = validateCancellation(
    appointment.scheduledStartTime,
  )

  if (!canCancel) {
    throw new AppError(
      400,
      hasPenalty
        ? 'A consulta já ocorreu e não pode ser cancelada'
        : 'O horário da consulta já passou',
    )
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: 'cancelled',
      cancellationReason: data.cancellationReason,
      cancellationDate: new Date(),
      cancelledBy: cancelledBy === 'admin' ? 'admin' : cancelledBy,
      hasCancellationPenalty: hasPenalty,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  // Invalida cache de disponibilidade após cancelamento
  const dateStr = appointment.scheduledStartTime.toISOString().split('T')[0]!
  await invalidateAvailableSlotsCache(appointment.professionalId, dateStr)

  return updated
}

// ============================================================================
// MEDICAL_RECORDS
// ============================================================================

export async function createMedicalRecord(
  patientId: number,
  professionalId: number,
  appointmentId: number | undefined,
  recordText: string,
) {
  const [record] = await db
    .insert(medicalRecords)
    .values({
      appointmentId,
      patientId,
      professionalId,
      recordText,
    })
    .returning()

  return record
}

export async function getMedicalRecordById(recordId: number) {
  return db.query.medicalRecords.findFirst({
    where: eq(medicalRecords.id, recordId),
    with: {
      diagnoses: true,
      prescriptions: true,
    },
  })
}

export async function getMedicalRecordWithEnrichedData(
  recordId: number,
) {
  // Fetch record and related data separately due to Drizzle type limitations
  const record = await db.query.medicalRecords.findFirst({
    where: eq(medicalRecords.id, recordId),
    with: {
      diagnoses: true,
      prescriptions: true,
    },
  })
  if (!record) return null

  const [patientRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, record.patientId))

  const [professionalRow] = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.id, record.professionalId))

  let patientWithUser = null
  if (patientRow) {
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, patientRow.userId))
    patientWithUser = { ...patientRow, user: u }
  }

  let professionalWithSpecialty = null
  if (professionalRow) {
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, professionalRow.userId))
    const [sp] = await db
      .select()
      .from(specialties)
      .where(eq(specialties.id, professionalRow.specialtyId))
    professionalWithSpecialty = { ...professionalRow, user: u, specialty: sp }
  }

  return {
    ...record,
    patient: patientWithUser,
    professional: professionalWithSpecialty,
  }
}

export async function getMedicalRecordsByPatient(patientId: number) {
  return db.query.medicalRecords.findMany({
    where: eq(medicalRecords.patientId, patientId),
    with: {
      diagnoses: true,
      prescriptions: true,
      professional: {
        with: {
          user: true,
          specialty: true,
        },
      },
    },
    orderBy: medicalRecords.recordDateTime,
  })
}

export async function addDiagnosis(
  medicalRecordId: number,
  cidCode: string | undefined,
  description: string,
) {
  const [diagnosis] = await db
    .insert(diagnoses)
    .values({
      medicalRecordId,
      cidCode,
      description,
    })
    .returning()

  return diagnosis
}

export async function addPrescription(
  medicalRecordId: number,
  medication: string,
  dosage: string,
  instructions: string,
  validity: Date | undefined,
) {
  const [prescription] = await db
    .insert(prescriptions)
    .values({
      medicalRecordId,
      medication,
      dosage,
      instructions,
      validity,
    })
    .returning()

  return prescription
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function createDocument(
  data: Omit<CreateDocument, 'patientId'> & {
    patientId: number
    professionalId: number | null
    fileKey: string
    fileMetadata: { originalName: string; mimetype: string; size: number }
  },
) {
  const [doc] = await db
    .insert(documents)
    .values({
      patientId: data.patientId,
      professionalId: data.professionalId,
      medicalRecordId: data.medicalRecordId,
      appointmentId: data.appointmentId,
      documentType: data.documentType,
      title: data.title,
      description: data.description,
      fileUrl: data.fileKey,
      metadata: data.fileMetadata,
    })
    .returning()

  return doc
}

export async function getDocumentById(documentId: number) {
  return db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    with: {
      patient: { with: { user: true } },
      professional: { with: { user: true } },
    },
  })
}

export async function getDocumentsByPatient(patientId: number) {
  return db.query.documents.findMany({
    where: eq(documents.patientId, patientId),
    orderBy: documents.createdAt,
  })
}

export async function archiveDocument(documentId: number, isArchived: boolean) {
  const [doc] = await db
    .update(documents)
    .set({
      isArchived,
      archivedAt: isArchived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))
    .returning()
  return doc
}

export async function deleteDocument(documentId: number) {
  const [doc] = await db
    .delete(documents)
    .where(eq(documents.id, documentId))
    .returning()
  return doc
}

// ============================================================================
// EMOTION LOGS
// ============================================================================

export async function createEmotionLog(patientId: number, data: CreateEmotionLog) {
  const [log] = await db
    .insert(emotionLogs)
    .values({
      patientId,
      moodValue: data.moodValue,
      moodLabel: data.moodLabel,
      note: data.note,
    })
    .returning()
  return log
}

export async function getEmotionLogsByPatient(patientId: number, days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  return db
    .select()
    .from(emotionLogs)
    .where(
      and(
        eq(emotionLogs.patientId, patientId),
        gte(emotionLogs.createdAt, since),
      ),
    )
    .orderBy(desc(emotionLogs.createdAt))
}

// ============================================================================
// PROFESSIONAL_PATIENTS
// ============================================================================

export async function linkPatientToProfessional(
  professionalId: number,
  patientId: number,
) {
  const existing = await db
    .select()
    .from(professionalPatients)
    .where(
      and(
        eq(professionalPatients.professionalId, professionalId),
        eq(professionalPatients.patientId, patientId),
      ),
    )

  if (existing.length > 0) return existing[0]!

  const [link] = await db
    .insert(professionalPatients)
    .values({ professionalId, patientId })
    .returning()

  return link
}

export async function getLinkedPatientsByProfessional(
  professionalId: number,
) {
  const rows = await db.query.professionalPatients.findMany({
    where: eq(professionalPatients.professionalId, professionalId),
    with: {
      patient: {
        with: {
          user: true,
        },
      },
    },
    orderBy: professionalPatients.createdAt,
  })

  return rows.map((r) => r.patient)
}

export async function getAllPatients(searchTerm?: string) {
  if (searchTerm) {
    const pattern = `%${searchTerm}%`
    const rows = await db
      .select()
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(
        or(ilike(patients.name, pattern), ilike(patients.cpf, pattern)),
      )

    return rows.map((r) => ({
      ...r.patients,
      user: r.users,
    }))
  }

  return db.query.patients.findMany({
    with: { user: true },
    orderBy: (pts, { asc }) => [asc(pts.name)],
  })
}

export async function linkPatient(
  professionalId: number,
  patientId: number,
) {
  return linkPatientToProfessional(professionalId, patientId)
}

// ============================================================================
// PROFESSIONAL SUMMARY (aggregated metrics)
// ============================================================================

export interface ProfessionalSummary {
  totalPatients: number
  totalAppointments: number
  scheduledCount: number
  completedCount: number
  cancelledCount: number
}

export async function getProfessionalSummary(
  professionalId: number,
): Promise<ProfessionalSummary> {
  const linkedPatients = await db
    .select({ id: professionalPatients.id })
    .from(professionalPatients)
    .where(eq(professionalPatients.professionalId, professionalId))

  const allAppointments = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.professionalId, professionalId))

  const totalPatients = linkedPatients.length
  const totalAppointments = allAppointments.length
  const scheduledCount = allAppointments.filter(
    (a) => a.status === 'scheduled',
  ).length
  const completedCount = allAppointments.filter(
    (a) => a.status === 'completed',
  ).length
  const cancelledCount = allAppointments.filter(
    (a) => a.status === 'cancelled',
  ).length

  return {
    totalPatients,
    totalAppointments,
    scheduledCount,
    completedCount,
    cancelledCount,
  }
}

// ============================================================================
// REPORTS (CRUD)
// ============================================================================

export async function createReport(
  professionalId: number,
  data: CreateReport,
) {
  const [report] = await db
    .insert(reports)
    .values({
      professionalId,
      title: data.title,
      periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
      observations: data.observations,
    })
    .returning()

  return report
}

export async function getReportsByProfessional(professionalId: number) {
  return db
    .select()
    .from(reports)
    .where(eq(reports.professionalId, professionalId))
    .orderBy(desc(reports.createdAt))
}

export async function getReportById(reportId: number) {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))

  return report
}

export async function updateReport(
  reportId: number,
  professionalId: number,
  data: UpdateReport,
) {
  const [report] = await db
    .update(reports)
    .set({
      title: data.title,
      periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
      observations: data.observations,
      updatedAt: new Date(),
    })
    .where(
      and(eq(reports.id, reportId), eq(reports.professionalId, professionalId)),
    )
    .returning()

  if (!report) {
    throw new AppError(404, 'Relatório não encontrado')
  }

  return report
}

export async function deleteReport(reportId: number, professionalId: number) {
  const [report] = await db
    .delete(reports)
    .where(
      and(eq(reports.id, reportId), eq(reports.professionalId, professionalId)),
    )
    .returning()

  if (!report) {
    throw new AppError(404, 'Relatório não encontrado')
  }

  return report
}
