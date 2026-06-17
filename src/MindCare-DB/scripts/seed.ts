import 'dotenv/config'
import { db } from '../src/db/index.js'
import {
  users,
  specialties,
  healthProfessionals,
  patients,
  workingHours,
  appointments,
  appointmentMessages,
  telemedicineRooms,
  telemedicineMessages,
  professionalPatients,
  emotionLogs,
  medicalRecords,
  diagnoses,
  prescriptions,
  documents,
  notifications,
  aiLogs,
  auditLogs,
  reports,
} from '../src/db/schema/index.js'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

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

async function main() {
  console.log('🌱 Iniciando seed completo com dados reais...\n')

  const passwordHash = await bcrypt.hash('123456', SALT_ROUNDS)

  // ── Cleanup (ordem respeitando FKs) ──
  await db.delete(telemedicineMessages)
  await db.delete(telemedicineRooms)
  await db.delete(appointmentMessages)
  await db.delete(notifications)
  await db.delete(documents)
  await db.delete(prescriptions)
  await db.delete(diagnoses)
  await db.delete(medicalRecords)
  await db.delete(emotionLogs)
  await db.delete(professionalPatients)
  await db.delete(appointments)
  await db.delete(workingHours)
  await db.delete(healthProfessionals)
  await db.delete(patients)
  await db.delete(specialties)
  await db.delete(aiLogs)
  await db.delete(auditLogs)
  await db.delete(reports)
  await db.delete(users)

  // ── Especialidades ──
  const specData = [
    { name: 'Psicologia Clínica', description: 'Atendimento psicoterápico individual' },
    { name: 'Psiquiatria', description: 'Avaliação e tratamento medicamentoso' },
    { name: 'Psicanálise', description: 'Abordagem psicanalítica' },
    { name: 'Terapia Cognitivo-Comportamental', description: 'Abordagem TCC' },
  ]
  const insertedSpecs = await db.insert(specialties).values(specData).returning()
  console.log(`  ${insertedSpecs.length} especialidades criadas`)

  const findSpec = (name: string) => insertedSpecs.find((s) => s.name === name)!

  // ── Usuários ──
  const userData = [
    // Admin
    { email: 'admin@mindcare.com', role: 'admin' as const, passwordHash },
    // Profissionais (nomes reais)
    { email: 'dr.ricardo.silva@mindcare.com', role: 'professional' as const, passwordHash },
    { email: 'dra.camila.santos@mindcare.com', role: 'professional' as const, passwordHash },
    { email: 'dr.marcelo.costa@mindcare.com', role: 'professional' as const, passwordHash },
    // Pacientes (nomes reais)
    { email: 'ana.beatriz@email.com', role: 'patient' as const, passwordHash },
    { email: 'carlos.eduardo@email.com', role: 'patient' as const, passwordHash },
    { email: 'marina.fernandes@email.com', role: 'patient' as const, passwordHash },
    { email: 'joao.pedro@email.com', role: 'patient' as const, passwordHash },
    { email: 'lucia.santos@email.com', role: 'patient' as const, passwordHash },
  ]
  const insertedUsers = await db.insert(users).values(userData).returning()
  console.log(`  ${insertedUsers.length} usuários criados`)

  const findUser = (email: string) => insertedUsers.find((u) => u.email === email)!

  // ── Profissionais ──
  const profData = [
    {
      userId: findUser('dr.ricardo.silva@mindcare.com').id,
      crm: 'CRM-SP 123456',
      specialtyId: findSpec('Psicologia Clínica').id,
      bio: 'Psicólogo clínico formado pela USP, especialista em terapia cognitivo-comportamental com 12 anos de experiência no atendimento de ansiedade e depressão.',
    },
    {
      userId: findUser('dra.camila.santos@mindcare.com').id,
      crm: 'CRM-SP 789012',
      specialtyId: findSpec('Psiquiatria').id,
      bio: 'Psiquiatra formada pela UNIFESP, especializada em transtornos de humor, ansiedade e TDAH. Mestre em psicofarmacologia.',
    },
    {
      userId: findUser('dr.marcelo.costa@mindcare.com').id,
      crm: 'CRM-SP 345678',
      specialtyId: findSpec('Terapia Cognitivo-Comportamental').id,
      bio: 'Psicólogo especialista em TCC, doutorado em psicologia pela UFRJ. Atua com terapia de casal e transtornos alimentares.',
    },
  ]
  const insertedProfs = await db.insert(healthProfessionals).values(profData).returning()
  const [prof1, prof2, prof3] = insertedProfs
  console.log(`  ${insertedProfs.length} profissionais criados`)

  // ── Pacientes ──
  const patientData = [
    { userId: findUser('ana.beatriz@email.com').id, name: 'Ana Beatriz Oliveira', cpf: '11111111111', dateOfBirth: new Date('1995-03-15'), phone: '(11) 99999-0001', address: 'Rua das Flores, 123 - São Paulo, SP' },
    { userId: findUser('carlos.eduardo@email.com').id, name: 'Carlos Eduardo Lima', cpf: '22222222222', dateOfBirth: new Date('1988-07-22'), phone: '(11) 99999-0002', address: 'Av. Paulista, 1500 - São Paulo, SP' },
    { userId: findUser('marina.fernandes@email.com').id, name: 'Marina Fernandes Costa', cpf: '33333333333', dateOfBirth: new Date('2000-11-02'), phone: '(11) 99999-0003', address: 'Rua Augusta, 500 - São Paulo, SP' },
    { userId: findUser('joao.pedro@email.com').id, name: 'João Pedro Alves', cpf: '44444444444', dateOfBirth: new Date('1992-05-10'), phone: '(11) 99999-0004', address: 'Rua da Consolação, 800 - São Paulo, SP' },
    { userId: findUser('lucia.santos@email.com').id, name: 'Lúcia Santos Mendes', cpf: '55555555555', dateOfBirth: new Date('1985-09-28'), phone: '(11) 99999-0005', address: 'Rua Oscar Freire, 300 - São Paulo, SP' },
  ]
  const insertedPatients = await db.insert(patients).values(patientData).returning()
  const [p1, p2, p3, p4, p5] = insertedPatients
  console.log(`  ${insertedPatients.length} pacientes criados`)

  // ── Horários de trabalho ──
  const whData = [
    // Prof1: Ricardo - Seg a Sex (8h-12h, 13h-18h)
    { healthProfessionalId: prof1!.id, weekday: 1, startTime: '08:00', endTime: '12:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 1, startTime: '13:00', endTime: '18:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 2, startTime: '08:00', endTime: '12:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 2, startTime: '13:00', endTime: '18:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 3, startTime: '08:00', endTime: '12:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 4, startTime: '08:00', endTime: '12:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 4, startTime: '13:00', endTime: '18:00', isActive: true },
    { healthProfessionalId: prof1!.id, weekday: 5, startTime: '08:00', endTime: '12:00', isActive: true },
    // Prof2: Camila - Ter e Qui (9h-13h, 14h-18h)
    { healthProfessionalId: prof2!.id, weekday: 2, startTime: '09:00', endTime: '13:00', isActive: true },
    { healthProfessionalId: prof2!.id, weekday: 2, startTime: '14:00', endTime: '18:00', isActive: true },
    { healthProfessionalId: prof2!.id, weekday: 4, startTime: '09:00', endTime: '13:00', isActive: true },
    { healthProfessionalId: prof2!.id, weekday: 4, startTime: '14:00', endTime: '18:00', isActive: true },
    // Prof3: Marcelo - Seg, Qua, Sex (10h-12h, 14h-17h)
    { healthProfessionalId: prof3!.id, weekday: 1, startTime: '10:00', endTime: '12:00', isActive: true },
    { healthProfessionalId: prof3!.id, weekday: 1, startTime: '14:00', endTime: '17:00', isActive: true },
    { healthProfessionalId: prof3!.id, weekday: 3, startTime: '10:00', endTime: '12:00', isActive: true },
    { healthProfessionalId: prof3!.id, weekday: 3, startTime: '14:00', endTime: '17:00', isActive: true },
    { healthProfessionalId: prof3!.id, weekday: 5, startTime: '10:00', endTime: '12:00', isActive: true },
  ]
  await db.insert(workingHours).values(whData)
  console.log(`  ${whData.length} horários de trabalho criados`)

  // ── Consultas ──
  const aptData = [
    // ── Prof1 (Ricardo) ──
    // Ana (p1) com Ricardo - 3 completed, 1 scheduled
    { patientId: p1!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(-35, 9, 0), scheduledEndTime: makeDate(-35, 9, 50), status: 'completed' as const },
    { patientId: p1!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(-21, 9, 0), scheduledEndTime: makeDate(-21, 9, 50), status: 'completed' as const },
    { patientId: p1!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(-7, 9, 0), scheduledEndTime: makeDate(-7, 9, 50), status: 'completed' as const },
    { patientId: p1!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(2, 9, 0), scheduledEndTime: makeDate(2, 9, 50), status: 'scheduled' as const },
    // Carlos (p2) com Ricardo - 2 completed, 1 scheduled, 1 cancelled
    { patientId: p2!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(-28, 10, 0), scheduledEndTime: makeDate(-28, 10, 50), status: 'completed' as const },
    { patientId: p2!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(-14, 10, 0), scheduledEndTime: makeDate(-14, 10, 50), status: 'completed' as const },
    { patientId: p2!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(3, 10, 0), scheduledEndTime: makeDate(3, 10, 50), status: 'scheduled' as const },
    { patientId: p2!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(10, 10, 0), scheduledEndTime: makeDate(10, 10, 50), status: 'cancelled' as const },
    // Marina (p3) com Ricardo - 1 completed
    { patientId: p3!.id, professionalId: prof1!.id, scheduledStartTime: makeDate(-10, 14, 0), scheduledEndTime: makeDate(-10, 14, 50), status: 'completed' as const },

    // ── Prof2 (Camila) ──
    // João (p4) com Camila - 2 completed, 1 scheduled
    { patientId: p4!.id, professionalId: prof2!.id, scheduledStartTime: makeDate(-30, 10, 0), scheduledEndTime: makeDate(-30, 10, 50), status: 'completed' as const },
    { patientId: p4!.id, professionalId: prof2!.id, scheduledStartTime: makeDate(-16, 10, 0), scheduledEndTime: makeDate(-16, 10, 50), status: 'completed' as const },
    { patientId: p4!.id, professionalId: prof2!.id, scheduledStartTime: makeDate(4, 14, 0), scheduledEndTime: makeDate(4, 14, 50), status: 'scheduled' as const },
    // Lúcia (p5) com Camila - 2 completed, 1 scheduled
    { patientId: p5!.id, professionalId: prof2!.id, scheduledStartTime: makeDate(-25, 9, 0), scheduledEndTime: makeDate(-25, 9, 50), status: 'completed' as const },
    { patientId: p5!.id, professionalId: prof2!.id, scheduledStartTime: makeDate(-11, 9, 0), scheduledEndTime: makeDate(-11, 9, 50), status: 'completed' as const },
    { patientId: p5!.id, professionalId: prof2!.id, scheduledStartTime: makeDate(2, 9, 0), scheduledEndTime: makeDate(2, 9, 50), status: 'scheduled' as const },

    // ── Prof3 (Marcelo) ──
    // Ana (p1) também com Marcelo - 1 completed
    { patientId: p1!.id, professionalId: prof3!.id, scheduledStartTime: makeDate(-20, 14, 0), scheduledEndTime: makeDate(-20, 14, 50), status: 'completed' as const },
    // Marina (p3) com Marcelo - 2 completed, 1 scheduled
    { patientId: p3!.id, professionalId: prof3!.id, scheduledStartTime: makeDate(-18, 10, 0), scheduledEndTime: makeDate(-18, 10, 50), status: 'completed' as const },
    { patientId: p3!.id, professionalId: prof3!.id, scheduledStartTime: makeDate(-4, 10, 0), scheduledEndTime: makeDate(-4, 10, 50), status: 'completed' as const },
    { patientId: p3!.id, professionalId: prof3!.id, scheduledStartTime: makeDate(5, 10, 0), scheduledEndTime: makeDate(5, 10, 50), status: 'scheduled' as const },
    // João (p4) com Marcelo - 1 requested
    { patientId: p4!.id, professionalId: prof3!.id, scheduledStartTime: makeDate(7, 14, 0), scheduledEndTime: makeDate(7, 14, 50), status: 'requested' as const },
  ]

  const insertedAppts = await db.insert(appointments).values(aptData).returning()
  console.log(`  ${insertedAppts.length} consultas criadas`)

  // ── Vínculos paciente-profissional ──
  const linkData = [
    { professionalId: prof1!.id, patientId: p1!.id },
    { professionalId: prof1!.id, patientId: p2!.id },
    { professionalId: prof1!.id, patientId: p3!.id },
    { professionalId: prof2!.id, patientId: p4!.id },
    { professionalId: prof2!.id, patientId: p5!.id },
    { professionalId: prof3!.id, patientId: p1!.id },
    { professionalId: prof3!.id, patientId: p3!.id },
    { professionalId: prof3!.id, patientId: p4!.id },
  ]
  await db.insert(professionalPatients).values(linkData)
  console.log(`  ${linkData.length} vínculos criados`)

  // ── Registros de Humor (EMOTION LOGS) ──
  // Cada paciente tem um padrão DIFERENTE para que os gráficos fiquem distintos
  const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Feliz', 'Muito feliz']

  // Helper para criar logs de humor com padrão específico
  function buildMoodLogs(patientId: number, pattern: (dayIndex: number) => { moodValue: number, note?: string }, totalDays = 30) {
    const logs: { patientId: number; moodValue: number; moodLabel: string; note: string | null; createdAt: Date }[] = []
    for (let i = totalDays - 1; i >= 0; i--) {
      // Pula alguns dias aleatórios para parecer real
      if (i % 7 === 6) continue
      const result = pattern(i)
      const createdAt = daysAgo(i)
      logs.push({
        patientId,
        moodValue: result.moodValue,
        moodLabel: moodLabels[result.moodValue - 1]!,
        note: result.note ?? null,
        createdAt,
      })
    }
    return logs
  }

  // P1 - Ana: Pessoa OTIMISTA/HAPPY (mood 3-5, predominante 4-5)
  const anaLogs = buildMoodLogs(p1!.id, (i) => {
    const base = 3 + Math.sin(i * 0.5) * 0.8
    return { moodValue: Math.min(5, Math.max(3, Math.round(base + Math.random() * 1.2))) }
  })

  // P2 - Carlos: Pessoa DEPRESSIVA/TRISTE (mood 1-3, predominante 1-2)
  const carlosLogs = buildMoodLogs(p2!.id, (i) => {
    const base = 1.5 + Math.sin(i * 0.2) * 0.8
    return { moodValue: Math.min(3, Math.max(1, Math.round(base + Math.random() * 0.8))) }
  })

  // P3 - Marina: PESSOA EM MELHORA (starts ~1-2, ends ~4-5)
  const marinaLogs = buildMoodLogs(p3!.id, (i) => {
    const progress = ((30 - i) / 30) * 3
    const base = 1.5 + progress + Math.sin(i * 0.3) * 0.5
    return { moodValue: Math.min(5, Math.max(1, Math.round(base + Math.random() * 0.6))) }
  })

  // P4 - João: PESSOA INSTÁVEL/VOLÁTIL (varia muito: 1-5 aleatório)
  const joaoLogs = buildMoodLogs(p4!.id, (_i) => {
    const rand = Math.random()
    const val = rand < 0.2 ? 1 : rand < 0.4 ? 5 : Math.round(1 + Math.random() * 4)
    return { moodValue: Math.min(5, Math.max(1, val)) }
  })

  // P5 - Lúcia: PESSOA ESTÁVEL/NEUTRA (mood 3, ocasionalmente 2 ou 4)
  const luciaLogs = buildMoodLogs(p5!.id, (_i) => {
    const rand = Math.random()
    const val = rand < 0.1 ? 2 : rand < 0.85 ? 3 : 4
    return { moodValue: val }
  })

  await db.insert(emotionLogs).values([...anaLogs, ...carlosLogs, ...marinaLogs, ...joaoLogs, ...luciaLogs])
  console.log(`  ${anaLogs.length + carlosLogs.length + marinaLogs.length + joaoLogs.length + luciaLogs.length} registros de humor criados`)

  // ── Prontuários (Medical Records) ──
  const medRecordData = [
    // Ana - consulta com Ricardo
    { patientId: p1!.id, professionalId: prof1!.id, appointmentId: insertedAppts[0]!.id, recordText: 'Paciente relata ansiedade relacionada ao trabalho. Apresenta preocupação excessiva com prazos e desempenho. Iniciaremos terapia cognitivo-comportamental focada em técnicas de relaxamento e reestruturação cognitiva.', recordDateTime: makeDate(-35, 9, 50) },
    // Carlos - consulta com Ricardo
    { patientId: p2!.id, professionalId: prof1!.id, appointmentId: insertedAppts[4]!.id, recordText: 'Paciente apresenta quadro depressivo moderado, com queixas de anedonia, fadiga persistente e alterações do sono. Relata pensamentos negativos recorrentes. Prescrito acompanhamento semanal e encaminhamento para avaliação psiquiátrica.', recordDateTime: makeDate(-28, 10, 50) },
    // Marina - consulta com Marcelo
    { patientId: p3!.id, professionalId: prof3!.id, appointmentId: insertedAppts[15]!.id, recordText: 'Paciente apresenta sintomas de transtorno alimentar com restrição calórica severa e episódios de compulsão. Trabalharemos reestruturação cognitiva em relação à imagem corporal e estabelecimento de padrão alimentar saudável.', recordDateTime: makeDate(-18, 10, 50) },
    // João - consulta com Camila
    { patientId: p4!.id, professionalId: prof2!.id, appointmentId: insertedAppts[9]!.id, recordText: 'Paciente relata episódios de ansiedade intensa com sintomas físicos como taquicardia e sudorese. Diagnóstico preliminar de Transtorno de Ansiedade Generalizada (F41.1). Iniciado tratamento medicamentoso com Sertralina 50mg.', recordDateTime: makeDate(-30, 10, 50) },
    // Lúcia - consulta com Camila
    { patientId: p5!.id, professionalId: prof2!.id, appointmentId: insertedAppts[12]!.id, recordText: 'Paciente queixa-se de insônia crônica e irritabilidade. Avaliação inicial sugere Transtorno de Insônia Crônica (G47.0). Prescrito higiene do sono e encaminhamento para psicoterapia complementar.', recordDateTime: makeDate(-25, 9, 50) },
  ]
  const insertedRecords = await db.insert(medicalRecords).values(medRecordData).returning()
  console.log(`  ${insertedRecords.length} prontuários criados`)

  // ── Diagnósticos ──
  const diagData = [
    { medicalRecordId: insertedRecords[0]!.id, cidCode: 'F41.1', description: 'Transtorno de ansiedade generalizada' },
    { medicalRecordId: insertedRecords[1]!.id, cidCode: 'F32.1', description: 'Episódio depressivo moderado' },
    { medicalRecordId: insertedRecords[2]!.id, cidCode: 'F50.0', description: 'Anorexia nervosa - forma restritiva' },
    { medicalRecordId: insertedRecords[3]!.id, cidCode: 'F41.1', description: 'Transtorno de ansiedade generalizada' },
    { medicalRecordId: insertedRecords[4]!.id, cidCode: 'G47.0', description: 'Insônia crônica' },
  ]
  await db.insert(diagnoses).values(diagData)
  console.log(`  ${diagData.length} diagnósticos criados`)

  // ── Prescrições ──
  const prescData = [
    { medicalRecordId: insertedRecords[1]!.id, medication: 'Sertralina', dosage: '50mg', instructions: 'Tomar 1 comprimido ao dia, após o café da manhã', validity: new Date('2026-08-01') },
    { medicalRecordId: insertedRecords[3]!.id, medication: 'Sertralina', dosage: '50mg', instructions: 'Tomar 1 comprimido ao dia pela manhã. Reavaliar em 30 dias.', validity: new Date('2026-07-15') },
    { medicalRecordId: insertedRecords[4]!.id, medication: 'Zolpidem', dosage: '10mg', instructions: 'Tomar 1 comprimido ao deitar, apenas se necessário. Máximo 5 dias consecutivos.', validity: new Date('2026-06-30') },
  ]
  await db.insert(prescriptions).values(prescData)
  console.log(`  ${prescData.length} prescrições criadas`)

  // ── Documentos ──
  const docData = [
    { patientId: p1!.id, professionalId: prof1!.id, documentType: 'medical_record' as const, title: 'Relatório de Avaliação Inicial - Ana Beatriz', description: 'Relatório completo de avaliação psicológica inicial', issuedAt: makeDate(-35, 10, 0) },
    { patientId: p1!.id, professionalId: prof3!.id, documentType: 'prescription' as const, title: 'Encaminhamento para Terapia de Grupo', description: 'Encaminhamento para grupo de apoio para ansiedade', issuedAt: makeDate(-20, 14, 30) },
    { patientId: p2!.id, professionalId: prof1!.id, documentType: 'medical_record' as const, title: 'Relatório de Evolução - Carlos Eduardo', description: 'Relatório de evolução do tratamento', issuedAt: makeDate(-14, 11, 0) },
    { patientId: p3!.id, professionalId: prof3!.id, documentType: 'certificate' as const, title: 'Atestado de Comparecimento - Marina', description: 'Atestado para justificar falta no trabalho', issuedAt: makeDate(-4, 11, 0) },
    { patientId: p4!.id, professionalId: prof2!.id, documentType: 'exam_result' as const, title: 'Resultado de Exames Laboratoriais - João Pedro', description: 'Exames de sangue e hormônios tireoidianos', issuedAt: makeDate(-30, 11, 0) },
    { patientId: p5!.id, professionalId: prof2!.id, documentType: 'report' as const, title: 'Relatório de Sono - Lúcia Santos', description: 'Relatório detalhado do diário de sono', issuedAt: makeDate(-25, 10, 0) },
  ]
  await db.insert(documents).values(docData)
  console.log(`  ${docData.length} documentos criados`)

  // ── Notificações ──
  const notifData = [
    { userId: findUser('ana.beatriz@email.com').id, type: 'appointment_scheduled' as const, title: 'Consulta agendada', message: 'Sua consulta com Dr. Ricardo Silva foi agendada para 02/06/2026 às 09:00.' },
    { userId: findUser('carlos.eduardo@email.com').id, type: 'appointment_reminder' as const, title: 'Lembrete de consulta', message: 'Sua consulta com Dr. Ricardo Silva é amanhã às 10:00.' },
    { userId: findUser('marina.fernandes@email.com').id, type: 'medical_record_available' as const, title: 'Prontuário atualizado', message: 'Seu prontuário foi atualizado após a consulta com Dr. Marcelo Costa.' },
    { userId: findUser('joao.pedro@email.com').id, type: 'prescription_ready' as const, title: 'Prescrição disponível', message: 'A prescrição de Sertralina 50mg está disponível para retirada.' },
    { userId: findUser('lucia.santos@email.com').id, type: 'message' as const, title: 'Mensagem da Dra. Camila', message: 'A Dra. Camila Santos enviou uma mensagem sobre seu tratamento.' },
  ]
  await db.insert(notifications).values(notifData)
  console.log(`  ${notifData.length} notificações criadas`)

  // ── Resumo ──
  console.log('\n✅ Seed concluído com sucesso!')
  console.log('\n' + '='.repeat(56))
  console.log('  📋 CREDENCIAIS DE TESTE (todos senha: 123456)')
  console.log('='.repeat(56))
  console.log()
  console.log('  👤 ADMIN:')
  console.log('    Email: admin@mindcare.com')
  console.log()
  console.log('  👨‍⚕️ PROFISSIONAIS:')
  console.log('    Dr. Ricardo Silva (Psicologia Clínica)')
  console.log('    Email: dr.ricardo.silva@mindcare.com')
  console.log()
  console.log('    Dra. Camila Santos (Psiquiatria)')
  console.log('    Email: dra.camila.santos@mindcare.com')
  console.log()
  console.log('    Dr. Marcelo Costa (Terapia Cognitivo-Comportamental)')
  console.log('    Email: dr.marcelo.costa@mindcare.com')
  console.log()
  console.log('  🧑 PACIENTES:')
  console.log('    Ana Beatriz Oliveira — humor: 😊 otimista')
  console.log('    Email: ana.beatriz@email.com')
  console.log()
  console.log('    Carlos Eduardo Lima — humor: 😢 deprimido')
  console.log('    Email: carlos.eduardo@email.com')
  console.log()
  console.log('    Marina Fernandes Costa — humor: 📈 em melhora')
  console.log('    Email: marina.fernandes@email.com')
  console.log()
  console.log('    João Pedro Alves — humor: 🎢 instável')
  console.log('    Email: joao.pedro@email.com')
  console.log()
  console.log('    Lúcia Santos Mendes — humor: 😐 estável')
  console.log('    Email: lucia.santos@email.com')
  console.log()
  console.log('  🔑 Senha de todos: 123456')
  console.log()
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
