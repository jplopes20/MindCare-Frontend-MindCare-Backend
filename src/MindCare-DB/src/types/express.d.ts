declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        email: string
        role: 'patient' | 'professional' | 'admin'
      }
    }
  }
}

export {}
