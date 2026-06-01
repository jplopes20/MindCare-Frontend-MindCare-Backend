#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE_URL:-http://localhost:4000}"
EMAIL="${SMOKE_EMAIL:-smoke-$(date +%s)@mindcare.local}"
export EMAIL

echo "==> GET $BASE/health"
curl -sS -i "$BASE/health" | head -n 20
echo ""

REGISTER_JSON=$(node -e "console.log(JSON.stringify({email:process.env.EMAIL,password:'senha1234',role:'patient'}))")
echo "==> POST $BASE/auth/register ($EMAIL)"
REG_BODY=$(curl -sS -w "\n%{http_code}" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_JSON")
REG_CODE=$(echo "$REG_BODY" | tail -n1)
REG_JSON=$(echo "$REG_BODY" | sed '$d')
echo "$REG_JSON"
echo "(HTTP $REG_CODE)"
echo ""

LOGIN_JSON=$(node -e "console.log(JSON.stringify({email:process.env.EMAIL,password:'senha1234'}))")
echo "==> POST $BASE/auth/login"
LOGIN_BODY=$(curl -sS -w "\n%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_JSON")
LOGIN_CODE=$(echo "$LOGIN_BODY" | tail -n1)
LOGIN_JSON=$(echo "$LOGIN_BODY" | sed '$d')
echo "$LOGIN_JSON"
echo "(HTTP $LOGIN_CODE)"
echo ""

TOKEN=$(echo "$LOGIN_JSON" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(j.token||'')")
if [[ -z "$TOKEN" ]]; then
  echo "ERRO: token vazio; não foi possível chamar /auth/me"
  exit 1
fi

echo "==> GET $BASE/auth/me (Bearer …)"
curl -sS -i "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" | head -n 25
echo ""

echo "==> Smoke OK (usuário $EMAIL)"
