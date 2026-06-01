import type { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { patients, healthProfessionals } from '../../db/schema/index.js'
import { AppError } from '../../shared/errors.js'
import { parseBody } from '../../shared/validate.js'
import {
  createMedicalRecordSchema,
  createDiagnosisSchema,
  createPrescriptionSchema,
} from './schemas.js'
import * as services from './services.js'

// ============================================================================
// MEDICAL_RECORDS CONTROLLERS
// ============================================================================

export async function createMedicalRecordController(
  req: Request,
  res: Response,
) {
  const body = parseBody(createMedicalRecordSchema, req.body)

  // Profissional autenticado
  const profList = await db
    .select()
    .from(healthProfessionals)
    .where(eq(healthProfessionals.userId, req.user!.id))

  if (profList.length === 0) {
    throw new AppError(404, 'Perfil de profissional não encontrado')
  }

  const professionalId = profList[0]!.id

  const record = await services.createMedicalRecord(
    body.patientId,
    professionalId,
    body.appointmentId,
    body.recordText,
  )

  res.status(201).json(record)
}

export async function getMedicalRecordController(req: Request, res: Response) {
  const { id } = req.params
  const record = await services.getMedicalRecordById(Number(id))

  if (!record) {
    throw new AppError(404, 'Prontuário não encontrado')
  }

  res.json(record)
}

export async function getMyMedicalRecordsController(
  req: Request,
  res: Response,
) {
  // Se paciente, retorna seus prontuários
  if (req.user!.role === 'patient') {
    const patientList = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, req.user!.id))

    if (patientList.length === 0) {
      throw new AppError(404, 'Perfil de paciente não encontrado')
    }

    const records = await services.getMedicalRecordsByPatient(patientList[0]!.id)
    res.json(records)
  } else {
    throw new AppError(403, 'Apenas pacientes podem listar seus prontuários')
  }
}

export async function getPatientMedicalRecordsController(
  req: Request,
  res: Response,
) {
  const { patientId } = req.params
  const pid = Number(patientId)

  if (!Number.isFinite(pid)) {
    throw new AppError(400, 'patientId inválido')
  }

  const records = await services.getMedicalRecordsByPatient(pid)

  res.json(records)
}

export async function addDiagnosisController(req: Request, res: Response) {
  const { recordId } = req.params
  const body = parseBody(createDiagnosisSchema, req.body)

  const record = await services.getMedicalRecordById(Number(recordId))
  if (!record) {
    throw new AppError(404, 'Prontuário não encontrado')
  }

  const diagnosis = await services.addDiagnosis(
    Number(recordId),
    body.cidCode,
    body.description,
  )

  res.status(201).json(diagnosis)
}

export async function addPrescriptionController(req: Request, res: Response) {
  const { recordId } = req.params
  const body = parseBody(createPrescriptionSchema, req.body)

  const record = await services.getMedicalRecordById(Number(recordId))
  if (!record) {
    throw new AppError(404, 'Prontuário não encontrado')
  }

  const prescription = await services.addPrescription(
    Number(recordId),
    body.medication,
    body.dosage,
    body.instructions,
    body.validity ? new Date(body.validity) : undefined,
  )

  res.status(201).json(prescription)
}

/**
 * Gera PDF do prontuário
 * Usa pdfkit para criar documento
 * NOTA: Instalar: npm install pdfkit @types/pdfkit
 */
export async function generateMedicalRecordPdfController(
  req: Request,
  res: Response,
) {
  const { recordId } = req.params

  const record = await services.getMedicalRecordWithEnrichedData(Number(recordId))
  if (!record) {
    throw new AppError(404, 'Prontuário não encontrado')
  }

  // Validação de permissão: paciente só vê seu prontuário, profissional vê seus registros
  if (req.user!.role === 'patient') {
    const patientList = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, req.user!.id))

    if (patientList.length === 0 || patientList[0]!.id !== record.patientId) {
      throw new AppError(403, 'Acesso negado')
    }
  } else if (req.user!.role === 'professional') {
    const profList = await db
      .select()
      .from(healthProfessionals)
      .where(eq(healthProfessionals.userId, req.user!.id))

    if (profList.length === 0 || profList[0]!.id !== record.professionalId) {
      throw new AppError(403, 'Acesso negado')
    }
  }

  // Importação dinâmica de pdfkit (ESM)
  const PDFDocument = (await import('pdfkit')).default

  const doc = new PDFDocument()

  // Headers
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="prontuario_${recordId}.pdf"`,
  )

  doc.pipe(res)

  const data = record as any

  // Timestamp da data do registro
  const recordDate =
    data.recordDateTime instanceof Date
      ? data.recordDateTime
      : new Date(data.recordDateTime)

  // Nomes do paciente e profissional
  const patientName =
    data.patient?.user?.email ?? `Paciente #${data.patientId}`
  const professionalName =
    data.professional?.user?.email ?? `Profissional #${data.professionalId}`
  const specialtyName =
    data.professional?.specialty?.name ?? ''

  // Conteúdo do PDF
  doc.fontSize(20).text('PRONTU\u00c1RIO M\u00c9DICO', { align: 'center' })
  doc.moveDown(0.5)
  doc
    .fontSize(9)
    .fillColor('#666')
    .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    .fillColor('#000')

  doc.moveDown()
  doc.fontSize(13).text('Informa\u00e7\u00f5es Gerais')
  doc.moveDown(0.3)

  doc.fontSize(10)
  doc.text(`ID do Prontu\u00e1rio: ${data.id}`)
  doc.text(`Paciente: ${patientName}`)
  doc.text(`Profissional: ${professionalName}`)
  if (specialtyName) doc.text(`Especialidade: ${specialtyName}`)
  doc.text(`Data do Registro: ${recordDate.toLocaleString('pt-BR')}`)
  doc.moveDown()

  doc.fontSize(13).text('Notas Cl\u00ednicas')
  doc.moveDown(0.3)
  doc.fontSize(10).text(data.recordText, { align: 'justify' })
  doc.moveDown()

  const diagnoses = data.diagnoses ?? []
  if (diagnoses.length > 0) {
    doc.fontSize(13).text('Diagn\u00f3sticos (CID-10)')
    doc.moveDown(0.3)
    diagnoses.forEach((diag: any) => {
      const code = diag.cidCode ? `[${diag.cidCode}] ` : ''
      doc.fontSize(10).text(`\u2022 ${code}${diag.description}`)
    })
    doc.moveDown()
  }

  const prescriptions = data.prescriptions ?? []
  if (prescriptions.length > 0) {
    doc.fontSize(13).text('Prescri\u00e7\u00f5es')
    prescriptions.forEach((presc: any, i: number) => {
      doc.moveDown(0.3)
      doc.fontSize(10).text(`${i + 1}. ${presc.medication} — ${presc.dosage}`)
      doc.fontSize(9).text(`   Instru\u00e7\u00f5es: ${presc.instructions}`)
      if (presc.validity) {
        const val = presc.validity instanceof Date ? presc.validity : new Date(presc.validity)
        doc.text(`   V\u00e1lido at\u00e9: ${val.toLocaleDateString('pt-BR')}`)
      }
    })
  }

  doc.moveDown()
  doc
    .fontSize(9)
    .fillColor('#999')
    .text('Documento gerado digitalmente pelo sistema MindCare.', { align: 'center' })

  doc.end()
}
