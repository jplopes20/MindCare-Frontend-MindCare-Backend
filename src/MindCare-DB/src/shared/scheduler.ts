import cron from 'node-cron'
import { and, eq, gte, lte, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  appointments,
  patients,
  healthProfessionals,
  users,
  specialties,
} from '../db/schema/index.js'
import { emailService } from '../modules/email/email.service.js'
import { runRetentionJob } from '../modules/domain/lgpd-retention.job.js'

async function sendRemindersForWindow(hoursAhead: number) {
  const now = new Date()
  const windowStart = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)
  const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000)

  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.scheduledStartTime, windowStart),
        lte(appointments.scheduledStartTime, windowEnd),
        inArray(appointments.status, ['scheduled', 'confirmed']),
      ),
    )

  for (const apt of rows) {
    try {
      const [patientRow] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, apt.patientId))
      if (!patientRow) continue

      const [patientUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, patientRow.userId))
      if (!patientUser) continue

      const [profRow] = await db
        .select()
        .from(healthProfessionals)
        .where(eq(healthProfessionals.id, apt.professionalId))
      if (!profRow) continue

      const [profUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, profRow.userId))
      if (!profUser) continue

      let specialtyName = ''
      if (profRow.specialtyId) {
        const [specRow] = await db
          .select()
          .from(specialties)
          .where(eq(specialties.id, profRow.specialtyId))
        if (specRow) specialtyName = specRow.name
      }

      const dateTime = apt.scheduledStartTime.toLocaleString('pt-BR')

      await emailService.sendAppointmentReminder({
        to: patientUser.email,
        patientName: patientRow.name || patientUser.email,
        professionalName: profUser.email,
        specialty: specialtyName,
        dateTime,
      })

      console.log(
        `[Scheduler] Lembrete ${hoursAhead}h enviado para appointment #${apt.id}`,
      )
    } catch (err) {
      console.error(
        `[Scheduler] Erro ao enviar lembrete para appointment #${apt.id}:`,
        err,
      )
    }
  }
}

export function startScheduler() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Verificando lembretes de 24h...')
    await sendRemindersForWindow(24)
  })

  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Verificando lembretes de 1h...')
    await sendRemindersForWindow(1)
  })

  // RN012 — Retenção LGPD: todo dia às 03:00
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Executando job de retenção LGPD...')
    await runRetentionJob().catch(console.error)
  })

  console.log(
    '[Scheduler] Iniciado — lembretes em 24h e 1h antes das consultas + retenção LGPD (03:00)',
  )
}
