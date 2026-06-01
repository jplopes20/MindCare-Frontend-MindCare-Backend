import {
  pgEnum,
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  time,
  jsonb,
  uniqueIndex,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users.js'

// ============================================================================
// ENUMS
// ============================================================================

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'requested',
  'scheduled',
  'confirmed',
  'rescheduled',
  'completed',
  'cancelled',
  'no_show',
])

export const appointmentCancelledByEnum = pgEnum(
  'appointment_cancelled_by',
  ['patient', 'professional', 'admin'],
)

export const telemedicineRoomStatusEnum = pgEnum('telemedicine_room_status', [
  'waiting',
  'active',
  'closed',
])

export const notificationStatusEnum = pgEnum('notification_status', [
  'unread',
  'read',
  'archived',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'appointment_scheduled',
  'appointment_cancelled',
  'appointment_reminder',
  'medical_record_available',
  'prescription_ready',
  'message',
])

export const documentTypeEnum = pgEnum('document_type', [
  'prescription',
  'medical_record',
  'exam_result',
  'certificate',
  'report',
  'other',
])

// ============================================================================
// 2. PATIENTS E HEALTH_PROFESSIONALS
// ============================================================================

/**
 * Pacientes: estende users com dados específicos
 * Referencia: user_id FK -> users.id
 */
export const patients = pgTable(
  'patients',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().unique().references(() => users.id),
    name: varchar('name', { length: 255 }),
    cpf: varchar('cpf', { length: 11 }).unique(),
    dateOfBirth: timestamp('date_of_birth'),
    phone: varchar('phone', { length: 20 }),
    address: text('address'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('patients_user_id_idx').on(table.userId),
  }),
)

/**
 * Profissionais de saúde: estende users com dados específicos
 * Referencia: user_id FK -> users.id
 */
export const healthProfessionals = pgTable(
  'health_professionals',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().unique().references(() => users.id),
    crm: varchar('crm', { length: 20 }).notNull().unique(), // Conselho Regional de Medicina
    specialtyId: integer('specialty_id')
      .notNull()
      .references(() => specialties.id),
    licenseExpiry: timestamp('license_expiry'),
    bio: text('bio'),
    avatar: varchar('avatar', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('health_professionals_user_id_idx').on(table.userId),
    specialtyIdIdx: index('health_professionals_specialty_id_idx').on(
      table.specialtyId,
    ),
  }),
)

// ============================================================================
// 3. SPECIALTIES
// ============================================================================

export const specialties = pgTable('specialties', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ============================================================================
// 4. WORKING_HOURS (Horários de atendimento dos profissionais)
// ============================================================================

/**
 * Horários de funcionamento dos profissionais
 * weekday: 0 = domingo, 1 = segunda, ..., 6 = sábado
 */
export const workingHours = pgTable(
  'working_hours',
  {
    id: serial('id').primaryKey(),
    healthProfessionalId: integer('health_professional_id')
      .notNull()
      .references(() => healthProfessionals.id),
    weekday: integer('weekday').notNull(), // 0-6
    startTime: time('start_time').notNull(), // HH:MM
    endTime: time('end_time').notNull(), // HH:MM
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    professionalIdx: index('working_hours_professional_idx').on(
      table.healthProfessionalId,
    ),
    weekdayCheck: check(
      'weekday_range',
      `weekday >= 0 AND weekday <= 6`,
    ),
    // Garante que startTime < endTime
    timeCheck: check(
      'start_before_end',
      `start_time < end_time`,
    ),
  }),
)

// ============================================================================
// 4b. PROFESSIONAL_PATIENTS (Vínculo explícito)
// ============================================================================

export const professionalPatients = pgTable(
  'professional_patients',
  {
    id: serial('id').primaryKey(),
    professionalId: integer('professional_id')
      .notNull()
      .references(() => healthProfessionals.id),
    patientId: integer('patient_id')
      .notNull()
      .references(() => patients.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    professionalIdx: index('prof_patients_professional_idx').on(
      table.professionalId,
    ),
    patientIdx: index('prof_patients_patient_idx').on(table.patientId),
    uniquePair: uniqueIndex('prof_patients_unique_pair').on(
      table.professionalId,
      table.patientId,
    ),
  }),
)

// ============================================================================
// 5. APPOINTMENTS (Consultas)
// ============================================================================

/**
 * Consultas (appointments) com regras de cancelamento e penalidade
 */
export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id').notNull().references(() => patients.id),
    professionalId: integer('professional_id')
      .notNull()
      .references(() => healthProfessionals.id),
    scheduledStartTime: timestamp('scheduled_start_time', { withTimezone: true })
      .notNull(),
    scheduledEndTime: timestamp('scheduled_end_time', { withTimezone: true })
      .notNull(),
    status: appointmentStatusEnum('status').notNull().default('requested'),
    // Negotiation / Reschedule
    proposedStartTime: timestamp('proposed_start_time', { withTimezone: true }),
    proposedEndTime: timestamp('proposed_end_time', { withTimezone: true }),
    negotiationNotes: text('negotiation_notes'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    // Cancelamento
    cancellationReason: text('cancellation_reason'),
    cancellationDate: timestamp('cancellation_date', { withTimezone: true }),
    cancelledBy: appointmentCancelledByEnum('cancelled_by'),
    hasCancellationPenalty: boolean('has_cancellation_penalty').default(false),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdx: index('appointments_patient_idx').on(table.patientId),
    professionalIdx: index('appointments_professional_idx').on(
      table.professionalId,
    ),
    scheduledStartIdx: index('appointments_scheduled_start_idx').on(
      table.scheduledStartTime,
    ),
    statusIdx: index('appointments_status_idx').on(table.status),
  }),
)

// ============================================================================
// 5b. APPOINTMENT_MESSAGES (Chat de negociação)
// ============================================================================

export const appointmentMessages = pgTable(
  'appointment_messages',
  {
    id: serial('id').primaryKey(),
    appointmentId: integer('appointment_id')
      .notNull()
      .references(() => appointments.id),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    appointmentIdx: index('appointment_messages_appointment_idx').on(
      table.appointmentId,
    ),
    senderIdx: index('appointment_messages_sender_idx').on(table.senderId),
  }),
)

// ============================================================================
// 6. MEDICAL_RECORDS, DIAGNOSES, PRESCRIPTIONS
// ============================================================================

export const medicalRecords = pgTable(
  'medical_records',
  {
    id: serial('id').primaryKey(),
    appointmentId: integer('appointment_id')
      .references(() => appointments.id),
    patientId: integer('patient_id').notNull().references(() => patients.id),
    professionalId: integer('professional_id')
      .notNull()
      .references(() => healthProfessionals.id),
    recordDateTime: timestamp('record_date_time', { withTimezone: true })
      .notNull()
      .defaultNow(),
    recordText: text('record_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    appointmentIdx: index('medical_records_appointment_idx').on(
      table.appointmentId,
    ),
    patientIdx: index('medical_records_patient_idx').on(table.patientId),
    professionalIdx: index('medical_records_professional_idx').on(
      table.professionalId,
    ),
  }),
)

export const diagnoses = pgTable(
  'diagnoses',
  {
    id: serial('id').primaryKey(),
    medicalRecordId: integer('medical_record_id')
      .notNull()
      .references(() => medicalRecords.id),
    cidCode: varchar('cid_code', { length: 10 }), // Código ICD-10
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recordIdx: index('diagnoses_record_idx').on(table.medicalRecordId),
  }),
)

export const prescriptions = pgTable(
  'prescriptions',
  {
    id: serial('id').primaryKey(),
    medicalRecordId: integer('medical_record_id')
      .notNull()
      .references(() => medicalRecords.id),
    medication: varchar('medication', { length: 255 }).notNull(),
    dosage: varchar('dosage', { length: 100 }).notNull(),
    instructions: text('instructions').notNull(),
    validity: timestamp('validity', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recordIdx: index('prescriptions_record_idx').on(table.medicalRecordId),
  }),
)

// ============================================================================
// 7. TELEMEDICINE_ROOMS E MESSAGES
// ============================================================================

export const telemedicineRooms = pgTable(
  'telemedicine_rooms',
  {
    id: serial('id').primaryKey(),
    appointmentId: integer('appointment_id')
      .notNull()
      .unique()
      .references(() => appointments.id),
    roomCode: varchar('room_code', { length: 50 }).notNull().unique(),
    status: telemedicineRoomStatusEnum('status').notNull().default('waiting'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => ({
    appointmentIdx: index('telemedicine_rooms_appointment_idx').on(
      table.appointmentId,
    ),
    roomCodeIdx: uniqueIndex('telemedicine_rooms_room_code_uq').on(
      table.roomCode,
    ),
  }),
)

export const telemedicineMessages = pgTable(
  'telemedicine_messages',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id').notNull().references(() => telemedicineRooms.id),
    userId: integer('user_id').notNull().references(() => users.id),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roomIdx: index('telemedicine_messages_room_idx').on(table.roomId),
    userIdx: index('telemedicine_messages_user_idx').on(table.userId),
  }),
)

export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id').notNull().references(() => patients.id),
    professionalId: integer('professional_id')
      .references(() => healthProfessionals.id),
    medicalRecordId: integer('medical_record_id').references(() => medicalRecords.id),
    appointmentId: integer('appointment_id').references(() => appointments.id),
    documentType: documentTypeEnum('document_type').notNull().default('other'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    fileUrl: varchar('file_url', { length: 1024 }),
    metadata: jsonb('metadata'),
    isArchived: boolean('is_archived').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdx: index('documents_patient_idx').on(table.patientId),
    professionalIdx: index('documents_professional_idx').on(table.professionalId),
    medicalRecordIdx: index('documents_medical_record_idx').on(
      table.medicalRecordId,
    ),
    appointmentIdx: index('documents_appointment_idx').on(table.appointmentId),
  }),
)

export const emotionLogs = pgTable(
  'emotion_logs',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id').notNull().references(() => patients.id),
    moodValue: integer('mood_value').notNull(),
    moodLabel: varchar('mood_label', { length: 50 }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    patientIdx: index('emotion_logs_patient_idx').on(table.patientId),
    createdAtIdx: index('emotion_logs_created_at_idx').on(table.createdAt),
  }),
)

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    type: notificationTypeEnum('type').notNull(),
    status: notificationStatusEnum('status').notNull().default('unread'),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    relatedAppointmentId: integer('related_appointment_id').references(
      () => appointments.id,
    ),
    relatedMedicalRecordId: integer('related_medical_record_id').references(
      () => medicalRecords.id,
    ),
    metadata: jsonb('metadata'),
    sentAt: timestamp('sent_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    relatedAppointmentIdx: index('notifications_related_appointment_idx').on(
      table.relatedAppointmentId,
    ),
    relatedMedicalRecordIdx:
      index('notifications_related_medical_record_idx').on(
        table.relatedMedicalRecordId,
      ),
    statusIdx: index('notifications_status_idx').on(table.status),
  }),
)

// ============================================================================
// RELATIONS (Drizzle ORM)
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, {
    fields: [users.id],
    references: [patients.userId],
  }),
  healthProfessional: one(healthProfessionals, {
    fields: [users.id],
    references: [healthProfessionals.userId],
  }),
  notifications: many(notifications),
  telemedicineMessages: many(telemedicineMessages),
}))

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  documents: many(documents),
  emotionLogs: many(emotionLogs),
  linkedProfessionals: many(professionalPatients),
}))

export const professionalPatientsRelations = relations(
  professionalPatients,
  ({ one }) => ({
    professional: one(healthProfessionals, {
      fields: [professionalPatients.professionalId],
      references: [healthProfessionals.id],
    }),
    patient: one(patients, {
      fields: [professionalPatients.patientId],
      references: [patients.id],
    }),
  }),
)

export const healthProfessionalsRelations = relations(
  healthProfessionals,
  ({ one, many }) => ({
    user: one(users, {
      fields: [healthProfessionals.userId],
      references: [users.id],
    }),
    specialty: one(specialties, {
      fields: [healthProfessionals.specialtyId],
      references: [specialties.id],
    }),
    workingHours: many(workingHours),
    appointments: many(appointments),
    medicalRecords: many(medicalRecords),
    documents: many(documents),
    linkedPatients: many(professionalPatients),
  }),
)

export const specialtiesRelations = relations(specialties, ({ many }) => ({
  professionals: many(healthProfessionals),
}))

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  professional: one(healthProfessionals, {
    fields: [workingHours.healthProfessionalId],
    references: [healthProfessionals.id],
  }),
}))

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [appointments.patientId],
      references: [patients.id],
    }),
    professional: one(healthProfessionals, {
      fields: [appointments.professionalId],
      references: [healthProfessionals.id],
    }),
    telemedicineRoom: one(telemedicineRooms, {
      fields: [appointments.id],
      references: [telemedicineRooms.appointmentId],
    }),
    documents: many(documents),
    messages: many(appointmentMessages),
  }),
)

export const appointmentMessagesRelations = relations(
  appointmentMessages,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [appointmentMessages.appointmentId],
      references: [appointments.id],
    }),
    sender: one(users, {
      fields: [appointmentMessages.senderId],
      references: [users.id],
    }),
  }),
)

export const medicalRecordsRelations = relations(
  medicalRecords,
  ({ one, many }) => ({
    appointment: one(appointments, {
      fields: [medicalRecords.appointmentId],
      references: [appointments.id],
    }),
    patient: one(patients, {
      fields: [medicalRecords.patientId],
      references: [patients.id],
    }),
    professional: one(healthProfessionals, {
      fields: [medicalRecords.professionalId],
      references: [healthProfessionals.id],
    }),
    diagnoses: many(diagnoses),
    prescriptions: many(prescriptions),
    documents: many(documents),
  }),
)

export const diagnosesRelations = relations(diagnoses, ({ one }) => ({
  medicalRecord: one(medicalRecords, {
    fields: [diagnoses.medicalRecordId],
    references: [medicalRecords.id],
  }),
}))

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  medicalRecord: one(medicalRecords, {
    fields: [prescriptions.medicalRecordId],
    references: [medicalRecords.id],
  }),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
  patient: one(patients, {
    fields: [documents.patientId],
    references: [patients.id],
  }),
  professional: one(healthProfessionals, {
    fields: [documents.professionalId],
    references: [healthProfessionals.id],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [documents.medicalRecordId],
    references: [medicalRecords.id],
  }),
  appointment: one(appointments, {
    fields: [documents.appointmentId],
    references: [appointments.id],
  }),
}))

export const emotionLogsRelations = relations(emotionLogs, ({ one }) => ({
  patient: one(patients, {
    fields: [emotionLogs.patientId],
    references: [patients.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedAppointment: one(appointments, {
    fields: [notifications.relatedAppointmentId],
    references: [appointments.id],
  }),
  relatedMedicalRecord: one(medicalRecords, {
    fields: [notifications.relatedMedicalRecordId],
    references: [medicalRecords.id],
  }),
}))

export const reports = pgTable(
  'reports',
  {
    id: serial('id').primaryKey(),
    professionalId: integer('professional_id')
      .notNull()
      .references(() => healthProfessionals.id),
    title: varchar('title', { length: 255 }).notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    observations: text('observations'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    professionalIdx: index('reports_professional_idx').on(table.professionalId),
  }),
)

export const reportsRelations = relations(reports, ({ one }) => ({
  professional: one(healthProfessionals, {
    fields: [reports.professionalId],
    references: [healthProfessionals.id],
  }),
}))

export const telemedicineRoomsRelations = relations(
  telemedicineRooms,
  ({ one, many }) => ({
    appointment: one(appointments, {
      fields: [telemedicineRooms.appointmentId],
      references: [appointments.id],
    }),
    messages: many(telemedicineMessages),
  }),
)

export const telemedicineMessagesRelations = relations(
  telemedicineMessages,
  ({ one }) => ({
    room: one(telemedicineRooms, {
      fields: [telemedicineMessages.roomId],
      references: [telemedicineRooms.id],
    }),
    user: one(users, {
      fields: [telemedicineMessages.userId],
      references: [users.id],
    }),
  }),
)
