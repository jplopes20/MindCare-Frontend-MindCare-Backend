import 'dotenv/config'
import { db } from '../src/db/index.js'
import { patients, medicalRecords } from '../src/db/schema/index.js'
import { encrypt, hashField } from '../src/shared/crypto.js'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('[encrypt-existing] Iniciando migração de dados legados...')

  // === Patients ===
  const allPatients = await db.select().from(patients)
  let patCount = 0
  for (const p of allPatients) {
    const updates: Record<string, unknown> = {}
    if (p.cpf && !p.cpf.startsWith('v1:')) {
      updates.cpf = encrypt(p.cpf)
      updates.cpfHash = hashField(p.cpf)
    }
    if (p.phone && !p.phone.startsWith('v1:')) {
      updates.phone = encrypt(p.phone)
    }
    if (p.address && !p.address.startsWith('v1:')) {
      updates.address = encrypt(p.address)
    }
    if (Object.keys(updates).length > 0) {
      await db.update(patients).set(updates).where(eq(patients.id, p.id))
      patCount++
    }
  }
  console.log(`[encrypt-existing] Patients criptografados: ${patCount}`)

  // === Medical Records ===
  const allRecords = await db.select().from(medicalRecords)
  let recCount = 0
  for (const r of allRecords) {
    if (r.recordText && !r.recordText.startsWith('v1:')) {
      const enc = encrypt(r.recordText)
      await db.update(medicalRecords).set({ recordText: enc ?? r.recordText }).where(eq(medicalRecords.id, r.id))
      recCount++
    }
  }
  console.log(`[encrypt-existing] Medical records criptografados: ${recCount}`)

  console.log('[encrypt-existing] Concluído.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[encrypt-existing] Erro:', err)
  process.exit(1)
})
