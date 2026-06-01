#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Subindo Postgres (Docker)…"
docker compose up -d postgres

echo "==> Aguardando Postgres aceitar conexões…"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U mindcare -d mindcare >/dev/null 2>&1; then
    echo "Postgres pronto."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "ERRO: timeout esperando Postgres. Rode: docker compose logs postgres" >&2
    exit 1
  fi
  sleep 1
done

echo "==> Aplicando migrations…"
npm run db:migrate

echo "==> Iniciando API (tsx, porta ${PORT:-4000})…"
npx tsx src/server.ts &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

echo "==> Aguardando /health…"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT:-4000}/health" >/dev/null 2>&1; then
    echo "API respondeu."
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "ERRO: API não subiu a tempo." >&2
    exit 1
  fi
  sleep 1
done

chmod +x scripts/smoke-api.sh
BASE_URL="http://localhost:${PORT:-4000}" bash scripts/smoke-api.sh

echo "==> Encerrando servidor local…"
kill "$SERVER_PID" 2>/dev/null || true
trap - EXIT

echo "==> Tudo concluído. Para uso diário: docker compose up -d postgres && npm run dev"
