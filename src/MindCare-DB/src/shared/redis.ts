import Redis from 'ioredis'

/**
 * Configuração do Redis para cache de disponibilidade e rate limit
 * Instalação: npm install ioredis
 */

const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = Number(process.env.REDIS_PORT) || 6379
const redisPassword = process.env.REDIS_PASSWORD

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

redis.on('connect', () => {
  console.log('[Redis] Conectado ao Redis')
})

redis.on('error', (err) => {
  console.error('[Redis] Erro de conexão:', err)
})

export { redis }

/**
 * Funções de cache para disponibilidade de profissionais
 */

const CACHE_TTL = 5 * 60 // 5 minutos em segundos

export async function cacheAvailableSlots(
  professionalId: number,
  date: string,
  slots: any[],
) {
  const key = `available_slots:${professionalId}:${date}`
  await redis.setex(key, CACHE_TTL, JSON.stringify(slots))
}

export async function getAvailableSlotsFromCache(
  professionalId: number,
  date: string,
): Promise<any[] | null> {
  const key = `available_slots:${professionalId}:${date}`
  const cached = await redis.get(key)
  if (!cached) return null
  return JSON.parse(cached, (_key, value) => {
    if (_key === 'startTime' || _key === 'endTime') return new Date(value)
    return value
  })
}

export async function invalidateAvailableSlotsCache(
  professionalId: number,
  date: string,
) {
  const key = `available_slots:${professionalId}:${date}`
  await redis.del(key)
}

export async function invalidateAllProfessionalSlots(professionalId: number) {
  const pattern = `available_slots:${professionalId}:*`
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

/**
 * Rate limit por IP/usuário
 * Uso: verificar em middleware antes de rotas críticas
 */

const RATE_LIMIT_TTL = 60 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100 // máximo 100 requisições por minuto

export async function checkRateLimit(identifier: string): Promise<boolean> {
  const key = `rate_limit:${identifier}`
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_TTL)
  }

  return current <= RATE_LIMIT_MAX_REQUESTS
}

export async function getRateLimitStatus(
  identifier: string,
): Promise<{ current: number; limit: number; remaining: number }> {
  const key = `rate_limit:${identifier}`
  const current = Number(await redis.get(key)) || 0

  return {
    current,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current),
  }
}
