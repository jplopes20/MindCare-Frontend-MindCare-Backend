import 'dotenv/config'

process.env.JWT_SECRET ??= 'test-secret-mindcare-2024'
process.env.DATABASE_URL ??= 'postgresql://mindcare:mindcare@localhost:5433/mindcare'
process.env.REDIS_HOST ??= 'localhost'
process.env.REDIS_PORT ??= '6379'
process.env.CORS_ORIGIN ??= 'http://localhost:5173'
process.env.NODE_ENV ??= 'test'
