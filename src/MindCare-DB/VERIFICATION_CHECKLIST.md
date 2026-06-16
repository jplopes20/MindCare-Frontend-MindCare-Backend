# ✅ Checklist de Verificação - MindCare Backend

Complete este checklist para garantir que toda a implementação está funcionando corretamente.

## 🔧 Pré-requisitos
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 14+ instalado
- [ ] Redis instalado (ou Docker)
- [ ] Git configurado

## 📦 Setup Inicial
```bash
cd src/MindCare-DB
npm install
cp .env.example .env
# Editar .env com suas credenciais
```
- [ ] Dependências instaladas sem erros
- [ ] Arquivo .env criado com DATABASE_URL válida
- [ ] Redis rodando na porta 6379 (ou Docker)
- [ ] PostgreSQL rodando na porta 5432

## 🗄️ Database
```bash
npm run db:generate
npm run db:migrate
```
- [ ] Migrations geradas sem erros
- [ ] Banco de dados criado
- [ ] Tabelas criadas com sucesso
- [ ] `postgres://user:pass@localhost:5432/mindcare_db` conecta

## 🚀 Servidor
```bash
npm run dev
```
- [ ] Servidor inicia sem erros
- [ ] Logs mostram porta 4000
- [ ] Socket.io conectado
- [ ] Sem warnings de TypeScript

## 🏥 Testes de Health Check
```bash
curl http://localhost:4000/health
```
- [ ] Retorna `{"ok":true,"timestamp":"..."}`
- [ ] Status 200 OK

## 🔐 Autenticação
```bash
# 1. Registrar paciente
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123","role":"patient"}'

# 2. Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'
```
- [ ] Register retorna token JWT
- [ ] Login retorna token JWT válido
- [ ] Token pode ser decodificado (https://jwt.io)

## 👥 Patients & Professionals
- [ ] POST `/api/patients` cria paciente
- [ ] GET `/api/patients/me` retorna perfil
- [ ] POST `/api/professionals` cria profissional
- [ ] GET `/api/professionals` lista (público)
- [ ] RBAC rejeita acesso não autorizado

## 🏥 Specialties
- [ ] GET `/api/specialties` lista (público)
- [ ] POST `/api/specialties` cria (admin)
- [ ] PUT/DELETE `/api/specialties/:id` funciona (admin)

## ⏰ Working Hours
- [ ] POST `/api/working-hours` cria horário
- [ ] Validação de sobreposição funciona
- [ ] GET `/api/working-hours/me` retorna horários

## 📅 Appointments
- [ ] GET `/api/appointments/available-slots?professionalId=1&date=2026-05-22` retorna slots
- [ ] Cache funciona (2ª requisição é mais rápida)
- [ ] POST `/api/appointments` agenda consulta
- [ ] POST `/api/appointments/:id/cancel` cancela com penalidade
- [ ] Validação de cancelamento (< 24h)

## 📋 Medical Records
- [ ] POST `/api/medical-records` cria prontuário
- [ ] POST `/api/medical-records/:id/diagnoses` adiciona diagnóstico
- [ ] POST `/api/medical-records/:id/prescriptions` adiciona prescrição
- [ ] GET `/api/medical-records/:id/pdf` retorna PDF
- [ ] PDF abre corretamente no navegador

## 🎥 Telemedicine
- [ ] POST `/api/telemedicine/rooms` cria sala
- [ ] GET `/api/telemedicine/rooms/:code` retorna sala
- [ ] PUT `/api/telemedicine/rooms/:code/status` atualiza status
- [ ] WebSocket conecta (`wss://localhost:4000`)
- [ ] Socket.io eventos funcionam:
  - [ ] `join_room` - entra na sala
  - [ ] `send_message` - envia mensagem
  - [ ] `receive_message` - recebe mensagem
  - [ ] `leave_room` - sai da sala

## 🔴 Redis & Cache
- [ ] Redis conecta sem erros (logs mostram "[Redis] Conectado")
- [ ] Cache de slots funciona (verificar com 2 requisições)
- [ ] Rate limiting funciona (testar com 101+ requisições)
- [ ] Headers `X-RateLimit-*` retornam corretamente

## 📊 Banco de Dados
- [ ] 10 tabelas criadas
- [ ] Foreign keys configuradas
- [ ] Indexes criados para performance
- [ ] Check constraints funcionam

## 🛡️ Segurança
- [ ] Senhas com bcrypt (verificar em DB: `password_hash` tem 60+ chars)
- [ ] JWT em headers Authorization
- [ ] RBAC rejeita requisições não autorizadas
- [ ] Helmet ativo (headers de segurança)
- [ ] CORS configurado

## 🧪 Testes de Segurança e LGPD
```bash
cd src/MindCare-DB && npm test
```
- [ ] CT010 — Acesso negado (403) quando paciente tenta ler prontuário de outro paciente
- [ ] CT011 — Token expirado retorna 401, token malformado retorna 401
- [ ] CT012 — Paciente solicita exclusão (201), admin aprova com anonimização, audit_log gerado, paciente não pode aprovar (403)
- [ ] Cobertura mínima esperada nos módulos `auth/` e `domain/lgpd*`
- [ ] Helper `expiredToken` e `signTokenFor` reutilizáveis em `tests/helpers/auth.ts`

## 📝 Código
- [ ] TypeScript compila sem erros (`npm run build`)
- [ ] Sem warnings ESLint
- [ ] Controllers retornam status HTTP corretos
- [ ] Tratamento de erro global funciona (testar com request inválida)

## 📚 Documentação
- [ ] README.md lido e compreendido
- [ ] API_TESTS.md com exemplos funcionando
- [ ] API_REQUESTS.http funciona no VS Code REST Client
- [ ] IMPLEMENTATION_SUMMARY.md reflete o código

## 🔀 Fluxo Completo
Executar sequência completa de uma consulta:
1. [ ] Registrar paciente
2. [ ] Registrar profissional
3. [ ] Criar especialidade (admin)
4. [ ] Criar perfil profissional com especialidade
5. [ ] Criar horários de trabalho
6. [ ] Paciente ve slots disponíveis
7. [ ] Paciente agenda consulta
8. [ ] Criar sala de telemedicina
9. [ ] Chat via Socket.io
10. [ ] Profissional cria prontuário
11. [ ] Adicionar diagnóstico + prescrição
12. [ ] Gerar PDF
13. [ ] Cancelar consulta

- [ ] Todos os passos completados com sucesso

## 🚨 Troubleshooting

### "Database connection error"
- [ ] Verificar DATABASE_URL em .env
- [ ] PostgreSQL rodando: `psql -U user -d mindcare_db`
- [ ] Porta 5432 aberta

### "Redis connection error"
- [ ] Redis rodando: `redis-cli ping` (retorna PONG)
- [ ] REDIS_HOST e REDIS_PORT em .env
- [ ] Se usar Docker: `docker-compose -f docker-compose-dev.yml up`

### "TypeScript errors"
- [ ] npm install
- [ ] Remover `node_modules` e reinstalar
- [ ] Verificar versão do Node.js (18+)

### "Rate limit exceeded"
- [ ] Esperado após 100 requisições/minuto
- [ ] Aguardar 60 segundos ou usar IP diferente

### "Port already in use"
- [ ] Alterar PORT em .env (ex: 4001)
- [ ] Ou parar outro processo na porta 4000

## ✨ Extras

### Testes Automatizados (Futuro)
- [ ] Jest configurado
- [ ] Testes unitários para services
- [ ] Testes de integração para rotas

### Performance
- [ ] Queries otimizadas com indexes
- [ ] Cache estratégico (5 min)
- [ ] Lazy loading de relações

### Monitoring (Futuro)
- [ ] Logs estruturados
- [ ] Sentry para error tracking
- [ ] Prometheus para métricas

---

## ✅ Checklist Completo!

Se todos os itens estão marcados como ✅, o backend está **100% operacional** e pronto para:
- ✅ Testes em Insomnia/Postman
- ✅ Integração com frontend React
- ✅ Deploy em produção
- ✅ Implementações adicionais

---

**Data de Verificação:** _______________
**Verificado por:** _______________
**Status Final:** ⭐ PRONTO PARA PRODUÇÃO

