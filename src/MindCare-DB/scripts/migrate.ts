import 'dotenv/config'
import postgres from 'postgres'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[migrate] DATABASE_URL não definido')
    process.exit(1)
  }

  const sql = postgres(url, { max: 1 })
  const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations')

  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__migrations (
      tag text PRIMARY KEY,
      applied_at timestamp with time zone DEFAULT now()
    )
  `

  const files = readdirSync(migrationsDir)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort()

  // Apply pending migrations (checks each file against tracking table)
  for (const file of files) {
    const tag = file.replace(/\.sql$/, '')
    const [existing] = await sql`SELECT 1 FROM drizzle.__migrations WHERE tag = ${tag}`
    if (existing) {
      console.log(`[migrate]  ${tag} — já aplicada`)
      continue
    }

    const content = readFileSync(join(migrationsDir, file), 'utf8')
    console.log(`[migrate]  Aplicando ${tag}...`)

    try {
      await sql.unsafe(content)
      await sql`INSERT INTO drizzle.__migrations (tag) VALUES (${tag})`
      console.log(`[migrate]  ${tag} — OK`)
    } catch (err) {
      console.error(`[migrate]  ${tag} — FALHOU:`, err)
      await sql.end()
      process.exit(1)
    }
  }

  console.log('[migrate]  Todas as migrações aplicadas')
  await sql.end()
}

main()
