import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { patients, users } from '../../db/schema/index.js'

export async function anonymizePatient(userId: number, deletionType: 'anonymization' | 'physical' = 'anonymization') {
  if (deletionType === 'physical') {
    const patient = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1).then(r => r[0])
    if (patient) {
      await db.delete(patients).where(eq(patients.id, patient.id))
    }
    await db.delete(users).where(eq(users.id, userId))
    return
  }

  const patient = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1).then(r => r[0])
  if (patient) {
    await db.update(patients).set({
      name: `Paciente Anonimizado #${patient.id}`,
      cpf: null,
      phone: null,
      address: null,
      dateOfBirth: null,
    }).where(eq(patients.id, patient.id))
  }

  await db.update(users).set({
    email: `deleted_${userId}@anonimized.local`,
    passwordHash: crypto.randomUUID(),
  }).where(eq(users.id, userId))
}
