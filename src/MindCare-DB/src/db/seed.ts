import { inArray, eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { db } from './index.js'
import { users, specialties, healthProfessionals, patients, workingHours, appointments, professionalPatients, emotionLogs, medicalRecords, diagnoses, prescriptions, documents, notifications, consentTerms } from './schema/index.js'

const SALT_ROUNDS = 10

function makeDate(daysOffset: number, hour: number, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, minute, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}

const SEED_EMAILS = [
  'admin@mindcare.com',
  'dr.ricardo.silva@mindcare.com',
  'dra.camila.santos@mindcare.com',
  'dr.marcelo.costa@mindcare.com',
  'ana.beatriz@email.com',
  'carlos.eduardo@email.com',
  'marina.fernandes@email.com',
  'joao.pedro@email.com',
  'lucia.santos@email.com',
] as const

const SPEC_NAMES = ['Psicologia Clínica', 'Psiquiatria', 'Psicanálise', 'Terapia Cognitivo-Comportamental'] as const

const PROFESSIONAL_SEEDS = [
  { email: 'dr.ricardo.silva@mindcare.com', crm: 'CRM-SP 123456', specialty: 'Psicologia Clínica', bio: 'Psicólogo clínico formado pela USP, especialista em terapia cognitivo-comportamental com 12 anos de experiência no atendimento de ansiedade e depressão.' },
  { email: 'dra.camila.santos@mindcare.com', crm: 'CRM-SP 789012', specialty: 'Psiquiatria', bio: 'Psiquiatra formada pela UNIFESP, especializada em transtornos de humor, ansiedade e TDAH. Mestre em psicofarmacologia.' },
  { email: 'dr.marcelo.costa@mindcare.com', crm: 'CRM-SP 345678', specialty: 'Terapia Cognitivo-Comportamental', bio: 'Psicólogo especialista em TCC, doutorado em psicologia pela UFRJ. Atua com terapia de casal e transtornos alimentares.' },
] as const

const PATIENT_SEEDS = [
  { email: 'ana.beatriz@email.com', name: 'Ana Beatriz Oliveira', cpf: '11111111111', dateOfBirth: new Date('1995-03-15'), phone: '(11) 99999-0001', address: 'Rua das Flores, 123 - São Paulo, SP' },
  { email: 'carlos.eduardo@email.com', name: 'Carlos Eduardo Lima', cpf: '22222222222', dateOfBirth: new Date('1988-07-22'), phone: '(11) 99999-0002', address: 'Av. Paulista, 1500 - São Paulo, SP' },
  { email: 'marina.fernandes@email.com', name: 'Marina Fernandes Costa', cpf: '33333333333', dateOfBirth: new Date('2000-11-02'), phone: '(11) 99999-0003', address: 'Rua Augusta, 500 - São Paulo, SP' },
  { email: 'joao.pedro@email.com', name: 'João Pedro Alves', cpf: '44444444444', dateOfBirth: new Date('1992-05-10'), phone: '(11) 99999-0004', address: 'Rua da Consolação, 800 - São Paulo, SP' },
  { email: 'lucia.santos@email.com', name: 'Lúcia Santos Mendes', cpf: '55555555555', dateOfBirth: new Date('1985-09-28'), phone: '(11) 99999-0005', address: 'Rua Oscar Freire, 300 - São Paulo, SP' },
] as const

export async function seedIfEmpty() {
  try {
    const passwordHash = await bcrypt.hash('123456', SALT_ROUNDS)

    // ── 1. Ensure seed users exist ──
    const existing = await db.select({ email: users.email }).from(users).where(inArray(users.email, [...SEED_EMAILS]))
    const existingSet = new Set(existing.map((u) => u.email))

    const toInsert = SEED_EMAILS.filter((email) => !existingSet.has(email)).map((email) => {
      const role = email === 'admin@mindcare.com' ? 'admin' as const
        : email.endsWith('@mindcare.com') ? 'professional' as const
        : 'patient' as const
      return { email, role, passwordHash }
    })

    if (toInsert.length > 0) {
      await db.insert(users).values(toInsert)
      console.log(`[seed] ${toInsert.length} usuários inseridos`)
    }

    await db.update(users).set({ passwordHash }).where(inArray(users.email, [...SEED_EMAILS]))

    const seedUsers = await db.select().from(users).where(inArray(users.email, [...SEED_EMAILS]))
    if (seedUsers.length === 0) {
      console.log('[seed] Nenhum usuário seed encontrado')
      return
    }
    const findUser = (email: string) => seedUsers.find((u) => u.email === email)!

    // ── 2. Ensure specialties exist ──
    const existingSpecs = await db.select().from(specialties).where(inArray(specialties.name, [...SPEC_NAMES]))
    let findSpec: (name: string) => { id: number; name: string }
    if (existingSpecs.length === SPEC_NAMES.length) {
      findSpec = (name: string) => existingSpecs.find((s) => s.name === name)!
    } else {
      const specData = SPEC_NAMES.map((name) => ({ name, description: `${name} — atendimento MindCare` }))
      await db.insert(specialties).values(specData).onConflictDoNothing()
      const allSpecs = await db.select().from(specialties).where(inArray(specialties.name, [...SPEC_NAMES]))
      findSpec = (name: string) => allSpecs.find((s) => s.name === name)!
      console.log('[seed] Especialidades inseridas')
    }

    // ── 3. Ensure professionals exist ──
    const existingProfs = await db.select().from(healthProfessionals).where(
      inArray(healthProfessionals.userId, seedUsers.filter((u) => u.role === 'professional').map((u) => u.id)),
    )
    const profMap = new Map(existingProfs.map((p) => [p.userId, p]))
    const profsToInsert = PROFESSIONAL_SEEDS.filter((s) => !profMap.has(findUser(s.email).id)).map((s) => ({
      userId: findUser(s.email).id,
      crm: s.crm,
      specialtyId: findSpec(s.specialty).id,
      bio: s.bio,
    }))
    if (profsToInsert.length > 0) {
      await db.insert(healthProfessionals).values(profsToInsert).onConflictDoNothing()
      console.log(`[seed] ${profsToInsert.length} profissionais inseridos`)
    }
    const allProfs = await db.select().from(healthProfessionals).where(
      inArray(healthProfessionals.userId, seedUsers.filter((u) => u.role === 'professional').map((u) => u.id)),
    )
    const findProf = (email: string) => allProfs.find((p) => p.userId === findUser(email).id)!

    // ── 4. Ensure patients exist ──
    const existingPats = await db.select().from(patients).where(
      inArray(patients.userId, seedUsers.filter((u) => u.role === 'patient').map((u) => u.id)),
    )
    const patMap = new Map(existingPats.map((p) => [p.userId, p]))
    const patsToInsert = PATIENT_SEEDS.filter((s) => !patMap.has(findUser(s.email).id)).map((s) => ({
      userId: findUser(s.email).id,
      name: s.name,
      cpf: s.cpf,
      dateOfBirth: s.dateOfBirth,
      phone: s.phone,
      address: s.address,
    }))
    if (patsToInsert.length > 0) {
      await db.insert(patients).values(patsToInsert).onConflictDoNothing()
      console.log(`[seed] ${patsToInsert.length} pacientes inseridos`)
    }
    const allPats = await db.select().from(patients).where(
      inArray(patients.userId, seedUsers.filter((u) => u.role === 'patient').map((u) => u.id)),
    )
    const findPat = (email: string) => allPats.find((p) => p.userId === findUser(email).id)!

    const p1 = findPat('ana.beatriz@email.com')
    const p2 = findPat('carlos.eduardo@email.com')
    const p3 = findPat('marina.fernandes@email.com')
    const p4 = findPat('joao.pedro@email.com')
    const p5 = findPat('lucia.santos@email.com')
    const prof1 = findProf('dr.ricardo.silva@mindcare.com')
    const prof2 = findProf('dra.camila.santos@mindcare.com')
    const prof3 = findProf('dr.marcelo.costa@mindcare.com')

    // ── 5. Ensure working hours ──
    const existingWH = await db.select().from(workingHours).where(
      inArray(workingHours.healthProfessionalId, [prof1.id, prof2.id, prof3.id]),
    )
    if (existingWH.length === 0) {
      await db.insert(workingHours).values([
        { healthProfessionalId: prof1.id, weekday: 1, startTime: '08:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 1, startTime: '13:00', endTime: '18:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 2, startTime: '08:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 2, startTime: '13:00', endTime: '18:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 3, startTime: '08:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 4, startTime: '08:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 4, startTime: '13:00', endTime: '18:00', isActive: true },
        { healthProfessionalId: prof1.id, weekday: 5, startTime: '08:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof2.id, weekday: 2, startTime: '09:00', endTime: '13:00', isActive: true },
        { healthProfessionalId: prof2.id, weekday: 2, startTime: '14:00', endTime: '18:00', isActive: true },
        { healthProfessionalId: prof2.id, weekday: 4, startTime: '09:00', endTime: '13:00', isActive: true },
        { healthProfessionalId: prof2.id, weekday: 4, startTime: '14:00', endTime: '18:00', isActive: true },
        { healthProfessionalId: prof3.id, weekday: 1, startTime: '10:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof3.id, weekday: 1, startTime: '14:00', endTime: '17:00', isActive: true },
        { healthProfessionalId: prof3.id, weekday: 3, startTime: '10:00', endTime: '12:00', isActive: true },
        { healthProfessionalId: prof3.id, weekday: 3, startTime: '14:00', endTime: '17:00', isActive: true },
        { healthProfessionalId: prof3.id, weekday: 5, startTime: '10:00', endTime: '12:00', isActive: true },
      ])
      console.log('[seed] Horários de trabalho inseridos')
    }

    // ── 6. Ensure appointments ──
    const existingAppts = await db.select().from(appointments).where(
      inArray(appointments.patientId, [p1.id, p2.id, p3.id, p4.id, p5.id]),
    )
    if (existingAppts.length === 0) {
      const insertedAppts = await db.insert(appointments).values([
        { patientId: p1.id, professionalId: prof1.id, scheduledStartTime: makeDate(-35, 9, 0), scheduledEndTime: makeDate(-35, 9, 50), status: 'completed' as const },
        { patientId: p1.id, professionalId: prof1.id, scheduledStartTime: makeDate(-21, 9, 0), scheduledEndTime: makeDate(-21, 9, 50), status: 'completed' as const },
        { patientId: p1.id, professionalId: prof1.id, scheduledStartTime: makeDate(-7, 9, 0), scheduledEndTime: makeDate(-7, 9, 50), status: 'completed' as const },
        { patientId: p1.id, professionalId: prof1.id, scheduledStartTime: makeDate(2, 9, 0), scheduledEndTime: makeDate(2, 9, 50), status: 'scheduled' as const },
        { patientId: p2.id, professionalId: prof1.id, scheduledStartTime: makeDate(-28, 10, 0), scheduledEndTime: makeDate(-28, 10, 50), status: 'completed' as const },
        { patientId: p2.id, professionalId: prof1.id, scheduledStartTime: makeDate(-14, 10, 0), scheduledEndTime: makeDate(-14, 10, 50), status: 'completed' as const },
        { patientId: p2.id, professionalId: prof1.id, scheduledStartTime: makeDate(3, 10, 0), scheduledEndTime: makeDate(3, 10, 50), status: 'scheduled' as const },
        { patientId: p2.id, professionalId: prof1.id, scheduledStartTime: makeDate(10, 10, 0), scheduledEndTime: makeDate(10, 10, 50), status: 'cancelled' as const },
        { patientId: p3.id, professionalId: prof1.id, scheduledStartTime: makeDate(-10, 14, 0), scheduledEndTime: makeDate(-10, 14, 50), status: 'completed' as const },
        { patientId: p4.id, professionalId: prof2.id, scheduledStartTime: makeDate(-30, 10, 0), scheduledEndTime: makeDate(-30, 10, 50), status: 'completed' as const },
        { patientId: p4.id, professionalId: prof2.id, scheduledStartTime: makeDate(-16, 10, 0), scheduledEndTime: makeDate(-16, 10, 50), status: 'completed' as const },
        { patientId: p4.id, professionalId: prof2.id, scheduledStartTime: makeDate(4, 14, 0), scheduledEndTime: makeDate(4, 14, 50), status: 'scheduled' as const },
        { patientId: p5.id, professionalId: prof2.id, scheduledStartTime: makeDate(-25, 9, 0), scheduledEndTime: makeDate(-25, 9, 50), status: 'completed' as const },
        { patientId: p5.id, professionalId: prof2.id, scheduledStartTime: makeDate(-11, 9, 0), scheduledEndTime: makeDate(-11, 9, 50), status: 'completed' as const },
        { patientId: p5.id, professionalId: prof2.id, scheduledStartTime: makeDate(2, 9, 0), scheduledEndTime: makeDate(2, 9, 50), status: 'scheduled' as const },
        { patientId: p1.id, professionalId: prof3.id, scheduledStartTime: makeDate(-20, 14, 0), scheduledEndTime: makeDate(-20, 14, 50), status: 'completed' as const },
        { patientId: p3.id, professionalId: prof3.id, scheduledStartTime: makeDate(-18, 10, 0), scheduledEndTime: makeDate(-18, 10, 50), status: 'completed' as const },
        { patientId: p3.id, professionalId: prof3.id, scheduledStartTime: makeDate(-4, 10, 0), scheduledEndTime: makeDate(-4, 10, 50), status: 'completed' as const },
        { patientId: p3.id, professionalId: prof3.id, scheduledStartTime: makeDate(5, 10, 0), scheduledEndTime: makeDate(5, 10, 50), status: 'scheduled' as const },
        { patientId: p4.id, professionalId: prof3.id, scheduledStartTime: makeDate(7, 14, 0), scheduledEndTime: makeDate(7, 14, 50), status: 'requested' as const },
      ]).returning()
      console.log(`[seed] ${insertedAppts.length} consultas criadas`)

      await db.insert(professionalPatients).values([
        { professionalId: prof1.id, patientId: p1.id },
        { professionalId: prof1.id, patientId: p2.id },
        { professionalId: prof1.id, patientId: p3.id },
        { professionalId: prof2.id, patientId: p4.id },
        { professionalId: prof2.id, patientId: p5.id },
        { professionalId: prof3.id, patientId: p1.id },
        { professionalId: prof3.id, patientId: p3.id },
        { professionalId: prof3.id, patientId: p4.id },
      ])

      const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Feliz', 'Muito feliz']
      function buildMoodLogs(patientId: number, pattern: (i: number) => { moodValue: number }, totalDays = 30) {
        const logs: { patientId: number; moodValue: number; moodLabel: string; note: null; createdAt: Date }[] = []
        for (let i = totalDays - 1; i >= 0; i--) {
          if (i % 7 === 6) continue
          const r = pattern(i)
          logs.push({ patientId, moodValue: r.moodValue, moodLabel: moodLabels[r.moodValue - 1]!, note: null, createdAt: daysAgo(i) })
        }
        return logs
      }
      await db.insert(emotionLogs).values([
        ...buildMoodLogs(p1.id, (i) => ({ moodValue: Math.min(5, Math.max(3, Math.round(3 + Math.sin(i * 0.5) * 0.8 + Math.random() * 1.2))) })),
        ...buildMoodLogs(p2.id, (i) => ({ moodValue: Math.min(3, Math.max(1, Math.round(1.5 + Math.sin(i * 0.2) * 0.8 + Math.random() * 0.8))) })),
        ...buildMoodLogs(p3.id, (i) => ({ moodValue: Math.min(5, Math.max(1, Math.round(1.5 + ((30 - i) / 30) * 3 + Math.sin(i * 0.3) * 0.5 + Math.random() * 0.6))) })),
        ...buildMoodLogs(p4.id, () => { const r = Math.random(); return { moodValue: r < 0.2 ? 1 : r < 0.4 ? 5 : Math.round(1 + Math.random() * 4) } }),
        ...buildMoodLogs(p5.id, () => { const r = Math.random(); return { moodValue: r < 0.1 ? 2 : r < 0.85 ? 3 : 4 } }),
      ])
      console.log('[seed] Registros de humor inseridos')

      const insertedRecords = await db.insert(medicalRecords).values([
        { patientId: p1.id, professionalId: prof1.id, appointmentId: insertedAppts[0]!.id, recordText: 'Paciente relata ansiedade relacionada ao trabalho. Apresenta preocupação excessiva com prazos e desempenho. Iniciaremos terapia cognitivo-comportamental focada em técnicas de relaxamento e reestruturação cognitiva.', recordDateTime: makeDate(-35, 9, 50) },
        { patientId: p2.id, professionalId: prof1.id, appointmentId: insertedAppts[4]!.id, recordText: 'Paciente apresenta quadro depressivo moderado, com queixas de anedonia, fadiga persistente e alterações do sono. Relata pensamentos negativos recorrentes. Prescrito acompanhamento semanal e encaminhamento para avaliação psiquiátrica.', recordDateTime: makeDate(-28, 10, 50) },
        { patientId: p3.id, professionalId: prof3.id, appointmentId: insertedAppts[16]!.id, recordText: 'Paciente apresenta sintomas de transtorno alimentar com restrição calórica severa e episódios de compulsão. Trabalharemos reestruturação cognitiva em relação à imagem corporal e estabelecimento de padrão alimentar saudável.', recordDateTime: makeDate(-18, 10, 50) },
        { patientId: p4.id, professionalId: prof2.id, appointmentId: insertedAppts[9]!.id, recordText: 'Paciente relata episódios de ansiedade intensa com sintomas físicos como taquicardia e sudorese. Diagnóstico preliminar de Transtorno de Ansiedade Generalizada (F41.1). Iniciado tratamento medicamentoso com Sertralina 50mg.', recordDateTime: makeDate(-30, 10, 50) },
        { patientId: p5.id, professionalId: prof2.id, appointmentId: insertedAppts[12]!.id, recordText: 'Paciente queixa-se de insônia crônica e irritabilidade. Avaliação inicial sugere Transtorno de Insônia Crônica (G47.0). Prescrito higiene do sono e encaminhamento para psicoterapia complementar.', recordDateTime: makeDate(-25, 9, 50) },
      ]).returning()
      console.log(`[seed] ${insertedRecords.length} prontuários criados`)

      await db.insert(diagnoses).values([
        { medicalRecordId: insertedRecords[0]!.id, cidCode: 'F41.1', description: 'Transtorno de ansiedade generalizada' },
        { medicalRecordId: insertedRecords[1]!.id, cidCode: 'F32.1', description: 'Episódio depressivo moderado' },
        { medicalRecordId: insertedRecords[2]!.id, cidCode: 'F50.0', description: 'Anorexia nervosa - forma restritiva' },
        { medicalRecordId: insertedRecords[3]!.id, cidCode: 'F41.1', description: 'Transtorno de ansiedade generalizada' },
        { medicalRecordId: insertedRecords[4]!.id, cidCode: 'G47.0', description: 'Insônia crônica' },
      ])

      await db.insert(prescriptions).values([
        { medicalRecordId: insertedRecords[1]!.id, medication: 'Sertralina', dosage: '50mg', instructions: 'Tomar 1 comprimido ao dia, após o café da manhã', validity: new Date('2026-08-01') },
        { medicalRecordId: insertedRecords[3]!.id, medication: 'Sertralina', dosage: '50mg', instructions: 'Tomar 1 comprimido ao dia pela manhã. Reavaliar em 30 dias.', validity: new Date('2026-07-15') },
        { medicalRecordId: insertedRecords[4]!.id, medication: 'Zolpidem', dosage: '10mg', instructions: 'Tomar 1 comprimido ao deitar, apenas se necessário. Máximo 5 dias consecutivos.', validity: new Date('2026-06-30') },
      ])

      await db.insert(documents).values([
        { patientId: p1.id, professionalId: prof1.id, documentType: 'medical_record' as const, title: 'Relatório de Avaliação Inicial - Ana Beatriz', description: 'Relatório completo de avaliação psicológica inicial', issuedAt: makeDate(-35, 10, 0) },
        { patientId: p1.id, professionalId: prof3.id, documentType: 'prescription' as const, title: 'Encaminhamento para Terapia de Grupo', description: 'Encaminhamento para grupo de apoio para ansiedade', issuedAt: makeDate(-20, 14, 30) },
        { patientId: p2.id, professionalId: prof1.id, documentType: 'medical_record' as const, title: 'Relatório de Evolução - Carlos Eduardo', description: 'Relatório de evolução do tratamento', issuedAt: makeDate(-14, 11, 0) },
        { patientId: p3.id, professionalId: prof3.id, documentType: 'certificate' as const, title: 'Atestado de Comparecimento - Marina', description: 'Atestado para justificar falta no trabalho', issuedAt: makeDate(-4, 11, 0) },
        { patientId: p4.id, professionalId: prof2.id, documentType: 'exam_result' as const, title: 'Resultado de Exames Laboratoriais - João Pedro', description: 'Exames de sangue e hormônios tireoidianos', issuedAt: makeDate(-30, 11, 0) },
        { patientId: p5.id, professionalId: prof2.id, documentType: 'report' as const, title: 'Relatório de Sono - Lúcia Santos', description: 'Relatório detalhado do diário de sono', issuedAt: makeDate(-25, 10, 0) },
      ])

      await db.insert(notifications).values([
        { userId: findUser('ana.beatriz@email.com').id, type: 'appointment_scheduled' as const, title: 'Consulta agendada', message: 'Sua consulta com Dr. Ricardo Silva foi agendada para 02/06/2026 às 09:00.' },
        { userId: findUser('carlos.eduardo@email.com').id, type: 'appointment_reminder' as const, title: 'Lembrete de consulta', message: 'Sua consulta com Dr. Ricardo Silva é amanhã às 10:00.' },
        { userId: findUser('marina.fernandes@email.com').id, type: 'medical_record_available' as const, title: 'Prontuário atualizado', message: 'Seu prontuário foi atualizado após a consulta com Dr. Marcelo Costa.' },
        { userId: findUser('joao.pedro@email.com').id, type: 'prescription_ready' as const, title: 'Prescrição disponível', message: 'A prescrição de Sertralina 50mg está disponível para retirada.' },
        { userId: findUser('lucia.santos@email.com').id, type: 'message' as const, title: 'Mensagem da Dra. Camila', message: 'A Dra. Camila Santos enviou uma mensagem sobre seu tratamento.' },
      ])
      console.log('[seed] Notificações inseridas')
    } else {
      console.log('[seed] Dados complementares já existem — preservados')
    }

    // ── 7. Ensure consent terms ──
    const existingConsentTerms = await db.select({ id: consentTerms.id }).from(consentTerms).limit(1)
    if (existingConsentTerms.length === 0) {
      await db.insert(consentTerms).values([
        { title: 'Política de Privacidade', description: 'Autorizo o tratamento dos meus dados pessoais conforme a Política de Privacidade da MindCare.', type: 'privacy_policy', version: '1.0.0' },
        { title: 'Termos de Uso', description: 'Declaro que li e concordo com os Termos de Uso da plataforma MindCare.', type: 'terms_of_use', version: '1.0.0' },
      ])
      console.log('[seed] Termos de consentimento inseridos')
    }

    console.log('[seed] Banco populado com sucesso!')
  } catch (err) {
    console.error('[seed] Erro durante seed:', err)
  }
}
