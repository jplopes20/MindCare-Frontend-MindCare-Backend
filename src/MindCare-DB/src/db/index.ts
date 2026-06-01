import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL não definido no .env')
}

const client = postgres(url, { max: 10 })

export const db = drizzle(client, { schema })
