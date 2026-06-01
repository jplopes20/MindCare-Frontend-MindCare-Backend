import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { AppError } from './shared/errors.js'
import { rateLimitMiddleware } from './shared/rate-limit.js'
import { authRouter } from './modules/auth/auth.router.js'
import { patientsProfessionalsRouter } from './modules/domain/patients-professionals.router.js'
import { appointmentsRouter } from './modules/domain/appointments.router.js'
import { medicalRecordsRouter } from './modules/domain/medical-records.router.js'
import { telemedicineRouter } from './modules/domain/telemedicine.router.js'
import { documentsRouter } from './modules/domain/documents.router.js'
import { emotionsRouter } from './modules/domain/emotions.router.js'
import { dashboardRouter } from './modules/domain/dashboard.router.js'
import { aiAssistantRouter } from './modules/domain/ai-assistant.router.js'
import { reportsRouter } from './modules/domain/reports.router.js'

const app = express()

// ============================================================================
// MIDDLEWARES
// ============================================================================

app.use(helmet())
app.use(cors())
app.use(express.json())

// Rate limiting (opcional - comentar se quiser desativar)
// app.use(rateLimitMiddleware)

// ============================================================================
// ROOT & HEALTH CHECK
// ============================================================================

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'MindCare API',
    version: '1.0.0',
    docs: '/health',
    frontend: 'http://localhost:5173',
  })
})

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date() })
})

// ============================================================================
// ROTAS
// ============================================================================

app.use('/auth', authRouter)

// Domínio: Patients, Professionals, Specialties, WorkingHours, Appointments
app.use('/api', patientsProfessionalsRouter)
app.use('/api', appointmentsRouter)

// Medical Records
app.use('/api', medicalRecordsRouter)

// Telemedicine
app.use('/api', telemedicineRouter)

// Documents (upload, download, list)
app.use('/api', documentsRouter)

// Emotions (mood tracking)
app.use('/api', emotionsRouter)

// Dashboard summary
app.use('/api', dashboardRouter)

// AI Assistant (draft, improve, diagnosis)
app.use('/api', aiAssistantRouter)

// Reports (CRUD)
app.use('/api', reportsRouter)

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message })
    }

    console.error(err)
    const body: { error: string; details?: string } = {
      error: 'Erro interno do servidor',
    }
    if (process.env.NODE_ENV !== 'production') {
      if (err instanceof Error) {
        body.details = err.message
      } else {
        body.details = String(err)
      }
    }
    return res.status(500).json(body)
  },
)

export default app

