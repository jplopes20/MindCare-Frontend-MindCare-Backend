import { pgTable, serial, integer, varchar, text, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users.js'

export const deletionStatusEnum = pgEnum('deletion_request_status', [
  'pending', 'approved', 'rejected', 'completed',
])
export const deletionTypeEnum = pgEnum('deletion_request_type', [
  'anonymization', 'physical',
])

export const dataDeletionRequests = pgTable('data_deletion_requests', {
  id: serial('id').primaryKey(),
  patientUserId: integer('patient_user_id').notNull().references(() => users.id),
  status: deletionStatusEnum('status').notNull().default('pending'),
  deletionType: deletionTypeEnum('deletion_type').notNull().default('anonymization'),
  reason: text('reason'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedByUserId: integer('processed_by_user_id').references(() => users.id),
  rejectionReason: text('rejection_reason'),
}, (t) => ({ patientIdx: index('ddr_patient_idx').on(t.patientUserId) }))

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }),
  entityId: integer('entity_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('audit_user_idx').on(t.userId),
  actionIdx: index('audit_action_idx').on(t.action),
}))

export const dataDeletionRequestsRelations = relations(dataDeletionRequests, ({ one }) => ({
  patient: one(users, { fields: [dataDeletionRequests.patientUserId], references: [users.id] }),
  processedBy: one(users, { fields: [dataDeletionRequests.processedByUserId], references: [users.id] }),
}))
