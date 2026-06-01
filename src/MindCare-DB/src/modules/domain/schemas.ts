import { z } from 'zod'

// ============================================================================
// PATIENTS
// ============================================================================

export const createPatientSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  dateOfBirth: z.string().datetime().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
})

export const updatePatientSchema = createPatientSchema.partial()

// ============================================================================
// HEALTH PROFESSIONALS
// ============================================================================

export const createHealthProfessionalSchema = z.object({
  crm: z.string().min(5).max(20).describe('Conselho Regional de Medicina'),
  specialtyId: z.number().int().positive(),
  licenseExpiry: z.string().datetime().optional(),
  bio: z.string().optional(),
})

export const updateHealthProfessionalSchema =
  createHealthProfessionalSchema.partial()

// ============================================================================
// SPECIALTIES
// ============================================================================

export const createSpecialtySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
})

export const updateSpecialtySchema = createSpecialtySchema.partial()

// ============================================================================
// WORKING_HOURS
// ============================================================================

export const createWorkingHoursSchema = z.object({
  weekday: z.number().int().min(0).max(6).describe('0=Domingo, 6=Sábado'),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato: HH:MM')
    .describe('Hora de início'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato: HH:MM')
    .describe('Hora de término'),
  isActive: z.boolean().optional().default(true),
})

export const updateWorkingHoursSchema = createWorkingHoursSchema.partial()

// ============================================================================
// APPOINTMENTS
// ============================================================================

export const createAppointmentSchema = z.object({
  professionalId: z.number().int().positive(),
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
})

export const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(5).max(500),
})

export const rescheduleAppointmentSchema = z.object({
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
  message: z.string().optional(),
})

export const confirmAppointmentSchema = z.object({
  appointmentId: z.number().int().positive(),
})

export const sendAppointmentMessageSchema = z.object({
  message: z.string().min(1).max(1000),
})

export const rejectRescheduleSchema = z.object({
  message: z.string().optional(),
})

// ============================================================================
// MEDICAL_RECORDS
// ============================================================================

export const createMedicalRecordSchema = z.object({
  appointmentId: z.number().int().positive().optional(),
  patientId: z.number().int().positive(),
  recordText: z.string().min(10),
})

export const createDiagnosisSchema = z.object({
  cidCode: z.string().max(10).optional(),
  description: z.string().min(5),
})

export const createPrescriptionSchema = z.object({
  medication: z.string().min(2).max(255),
  dosage: z.string().min(2).max(100),
  instructions: z.string().min(5),
  validity: z.string().datetime().optional(),
})

// ============================================================================
// TELEMEDICINE
// ============================================================================

export const createTelemedicineRoomSchema = z.object({
  appointmentId: z.number().int().positive(),
})

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
})

export type CreatePatient = z.infer<typeof createPatientSchema>
export type UpdatePatient = z.infer<typeof updatePatientSchema>
export type CreateHealthProfessional = z.infer<
  typeof createHealthProfessionalSchema
>
export type UpdateHealthProfessional = z.infer<
  typeof updateHealthProfessionalSchema
>
export type CreateSpecialty = z.infer<typeof createSpecialtySchema>
export type CreateWorkingHours = z.infer<typeof createWorkingHoursSchema>
export type CreateAppointment = z.infer<typeof createAppointmentSchema>
export type CancelAppointment = z.infer<typeof cancelAppointmentSchema>
export type CreateMedicalRecord = z.infer<typeof createMedicalRecordSchema>
export type CreateDiagnosis = z.infer<typeof createDiagnosisSchema>
export type CreatePrescription = z.infer<typeof createPrescriptionSchema>
export type SendMessage = z.infer<typeof sendMessageSchema>

// ============================================================================
// EMOTION LOGS
// ============================================================================

export const createEmotionLogSchema = z.object({
  moodValue: z.number().int().min(1).max(5),
  moodLabel: z.string().min(2).max(50).optional(),
  note: z.string().optional(),
})

export type CreateEmotionLog = z.infer<typeof createEmotionLogSchema>

// ============================================================================
// DOCUMENTS
// ============================================================================

export const documentTypeValues = [
  'prescription',
  'medical_record',
  'exam_result',
  'certificate',
  'report',
  'other',
] as const

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  documentType: z.enum(documentTypeValues).default('other'),
  patientId: z.number().int().positive().optional(),
  medicalRecordId: z.number().int().positive().optional(),
  appointmentId: z.number().int().positive().optional(),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  documentType: z.enum(documentTypeValues).optional(),
  expiresAt: z.string().datetime().optional(),
})

export const archiveDocumentSchema = z.object({
  isArchived: z.boolean(),
})

export const uploadFromUrlSchema = z.object({
  url: z.string().url('URL inválida'),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  documentType: z.enum(documentTypeValues).default('other'),
  patientId: z.number().int().positive().optional(),
})

export const uploadFromDriveSchema = z.object({
  googleFileId: z.string().min(1),
  googleFileName: z.string().min(1),
  googleMimeType: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  documentType: z.enum(documentTypeValues).default('other'),
  patientId: z.number().int().positive().optional(),
})

export type CreateDocument = z.infer<typeof createDocumentSchema>
export type UpdateDocument = z.infer<typeof updateDocumentSchema>

// ============================================================================
// AI ASSISTANT
// ============================================================================

export const aiDraftSchema = z.object({
  patientName: z.string().optional(),
  specialty: z.string().optional(),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
})

export const aiImproveSchema = z.object({
  currentText: z.string().min(1),
  instruction: z.string().optional(),
})

export const aiDiagnosisSchema = z.object({
  clinicalText: z.string().min(10),
})

export type AiDraft = z.infer<typeof aiDraftSchema>
export type AiImprove = z.infer<typeof aiImproveSchema>
export type AiDiagnosis = z.infer<typeof aiDiagnosisSchema>

// ============================================================================
// REPORTS
// ============================================================================

export const createReportSchema = z.object({
  title: z.string().min(1).max(255),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  observations: z.string().optional(),
})

export const updateReportSchema = createReportSchema.partial()

export const linkPatientSchema = z.object({
  patientId: z.number().int().positive(),
})

export type CreateReport = z.infer<typeof createReportSchema>
export type UpdateReport = z.infer<typeof updateReportSchema>
