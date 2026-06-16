import { db } from '../../db/index.js'
import { dataDeletionRequests, patients, appointments, auditLogs } from '../../db/schema/index.js'
import { and, eq, lt, sql } from 'drizzle-orm'
import { anonymizePatient } from './lgpd.service.js'

export async function runRetentionJob() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const overdue = await db.select().from(dataDeletionRequests)
    .where(and(
      eq(dataDeletionRequests.status, 'approved'),
      lt(dataDeletionRequests.processedAt, thirtyDaysAgo),
    ))

  for (const req of overdue) {
    await anonymizePatient(req.patientUserId, req.deletionType)
    await db.update(dataDeletionRequests)
      .set({ status: 'completed' })
      .where(eq(dataDeletionRequests.id, req.id))
    await db.insert(auditLogs).values({
      action: 'LGPD_RETENTION_AUTO_EXECUTED',
      entity: 'patients',
      entityId: req.patientUserId,
      metadata: { requestId: req.id },
    })
  }

  const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
  await db.execute(sql`
    SELECT p.user_id, MAX(a.scheduled_start_time) AS last_appointment
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.id
    GROUP BY p.user_id
    HAVING MAX(a.scheduled_start_time) < ${fiveYearsAgo} OR MAX(a.scheduled_start_time) IS NULL
  `)
}
