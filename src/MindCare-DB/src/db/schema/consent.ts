import { pgTable, serial, integer, varchar, text, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users.js'

export const consentTermTypeEnum = pgEnum('consent_term_type', [
  'privacy_policy',
  'terms_of_use',
  'data_processing',
  'lgpd',
])

export const consentTerms = pgTable('consent_terms', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: consentTermTypeEnum('type').notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userConsents = pgTable('user_consents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  consentTermId: integer('consent_term_id').notNull().references(() => consentTerms.id),
  accepted: boolean('accepted').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userConsentIdx: index('user_consents_user_idx').on(t.userId),
}))

export const consentTermsRelations = relations(consentTerms, ({ many }) => ({
  userConsents: many(userConsents),
}))

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, { fields: [userConsents.userId], references: [users.id] }),
  consentTerm: one(consentTerms, { fields: [userConsents.consentTermId], references: [consentTerms.id] }),
}))
