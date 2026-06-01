# AGENTS.md — MindCare monorepo

## Repo structure

Two projects in the same repo — no workspace tool:

### `/` — Frontend demo (React + Vite)
- `npm run dev` → port 5173
- Mock store: `src/store.js` (localStorage key `mindcare:store_v1`)
- No tests, no lint, no typecheck configured
- Login is fake (pick name + role, no password)

### `src/MindCare-DB/` — Backend API (Express + TypeScript)
- Dev: `npm run dev` (tsx watch, port 4000)
- Build: `npm run build` (tsc → `dist/`)
- Start: `npm run start` (node `dist/server.js`)
- **Prerequisites**: PostgreSQL + Redis (Docker: `docker compose up -d`)
- DB port: 5433 (not default 5432)
- Init order: `cp .env.example .env` → `npm run db:generate` → `npm run db:migrate` → `npm run dev`
- CORS origin defaults to `http://localhost:3000` (not 5173)
- Rate limit middleware is **commented out** in `src/app.ts`
- No test framework; smoke tests: `npm run smoke` / `npm run smoke:all`
- API requests example file: `API_REQUESTS.http` (VS Code REST Client format)

## Architecture notes

- Backend uses Drizzle ORM with PostgreSQL, Zod for validation
- Auth: JWT + bcrypt, RBAC middleware (roles: patient, professional, admin)
- Redis cache for available appointment slots (5 min TTL)
- Socket.io for telemedicine chat (handled in `src/server.ts`)
- PDF generation via PDFKit (medical records)
- Request flow: middleware → controller → service → DB (Drizzle)
- Error handling via `AppError` class + async handler wrapper
- Patient registration requires two steps: (1) `POST /auth/register` creates user, (2) `POST /api/patients` creates profile

## Testing quirks

- `npm test` in backend runs `echo "Error: no test specified" && exit 1` — don't bother
- Smoke test uses `scripts/smoke-api.sh` (creates unique email per run via timestamp)
- `scripts/run-all.sh` spins up Docker Postgres, runs migrations, starts server, runs smoke test, cleans up
- Frontend has no tests at all — manual demo only

## Environment

- `.env` in MindCare-DB is gitignored; copy `.env.example`
- Required vars: `DATABASE_URL`, `JWT_SECRET`, `REDIS_HOST`, `REDIS_PORT`, `PORT`, `CORS_ORIGIN`
