# 📁 Estrutura de Diretórios - MindCare Backend

```
mindcare-db/
│
├── 📄 README.md                          ⭐ Comece aqui - Overview completo
├── 📄 IMPLEMENTATION_SUMMARY.md           📋 Resumo detalhado da implementação
├── 📄 API_TESTS.md                        🧪 80+ exemplos de requisições HTTP
├── 📄 API_REQUESTS.http                   🔌 Requisições VS Code REST Client
├── 📄 VERIFICATION_CHECKLIST.md           ✅ Checklist de verificação
├── 📄 .env.example                        🔑 Variáveis de ambiente
├── 📄 .gitignore
├── 📄 .env                                🔑 (não commitar)
│
├── 📦 package.json                        🎯 Dependências + scripts
├── 📦 package-lock.json
├── 📄 tsconfig.json                       ⚙️ Configuração TypeScript
├── 📄 drizzle.config.ts                   🗄️ Configuração Drizzle
│
├── 🐳 docker-compose-dev.yml              🐳 Docker para PostgreSQL + Redis
│
├── src/
│   │
│   ├── 🚀 server.ts                       ⭐ Entry point + Socket.io
│   ├── 🚀 app.ts                          ⭐ Express app + rotas
│   │
│   ├── db/
│   │   ├── 🔌 index.ts                    Drizzle client
│   │   ├── migrations/
│   │   │   ├── 0000_strong_doomsday.sql  SQL migrations
│   │   │   └── meta/
│   │   │       ├── _journal.json
│   │   │       └── 0000_snapshot.json
│   │   │
│   │   └── schema/
│   │       ├── 📋 index.ts                Exports dos schemas
│   │       ├── 👤 users.ts                Schema: users + roles
│   │       └── 🏥 domain.ts               ⭐ TODOS os 10 schemas + relations
│   │           ├── patients
│   │           ├── health_professionals
│   │           ├── specialties
│   │           ├── working_hours
│   │           ├── appointments
│   │           ├── medical_records
│   │           ├── diagnoses
│   │           ├── prescriptions
│   │           ├── telemedicine_rooms
│   │           └── telemedicine_messages
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── 🔐 auth.router.ts          Rotas: register, login
│   │   │   ├── 🔐 auth.middleware.ts      Middleware: authGuard
│   │   │   ├── 🔐 auth.schemas.ts         Validação: loginSchema, registerSchema
│   │   │   ├── 🔐 rbac.middleware.ts      ⭐ Middleware: requireRole
│   │   │   └── 🔑 jwt-secret.ts           JWT configuration
│   │   │
│   │   └── domain/                        ⭐ Lógica de negócio
│   │       ├── 📋 schemas.ts              Zod validation (todos os requests)
│   │       ├── 🎯 services.ts             ⭐ Lógica complexa
│   │       │   ├── Patients service
│   │       │   ├── Professionals service
│   │       │   ├── Appointments com cache
│   │       │   ├── Availability function
│   │       │   ├── Cancellation validation
│   │       │   └── Medical records service
│   │       │
│   │       ├── 🎮 controllers.ts          Controllers gerais
│   │       ├── 🎮 appointments.controllers.ts  Controllers de appointments
│   │       ├── 🎮 medical-records.controllers.ts  Controllers + PDF
│   │       ├── 🎮 telemedicine.controllers.ts  Controllers telemedicina
│   │       │
│   │       ├── 🛣️ patients-professionals.router.ts  ⭐ Rotas
│   │       ├── 🛣️ appointments.router.ts         Rotas appointments
│   │       ├── 🛣️ medical-records.router.ts      Rotas medical records
│   │       ├── 🛣️ telemedicine.router.ts         Rotas telemedicine
│   │       │
│   │       ├── 🔌 socket-handlers.ts      ⭐ Socket.io events
│   │       │   ├── join_room
│   │       │   ├── send_message
│   │       │   ├── receive_message
│   │       │   └── leave_room
│   │       │
│   │       └── 📧 email/
│   │           └── 📝 email.notes.ts      Esboço de implementação
│   │
│   └── shared/
│       ├── ⚠️ errors.ts                   Custom AppError class
│       ├── ✅ validate.ts                 Validação Zod helper
│       ├── 🚀 async-handler.ts            Wrapper para async routes
│       ├── 🔴 redis.ts                    ⭐ Redis client + cache functions
│       └── 🚦 rate-limit.ts               Rate limiting middleware
│
├── scripts/
│   ├── run-all.sh
│   └── smoke-api.sh
│
└── 📚 Documentação
    ├── README.md                          🎯 START HERE
    ├── IMPLEMENTATION_SUMMARY.md           📊 O que foi feito
    ├── VERIFICATION_CHECKLIST.md           ✅ Como verificar
    ├── API_TESTS.md                        🧪 Exemplos de testes
    ├── API_REQUESTS.http                   🔌 REST Client
    └── DIRECTORY_STRUCTURE.md              📁 Este arquivo
```

---

## 🎯 Guia Rápido de Navegação

### 🚀 Para Começar
1. `README.md` - Overview do projeto
2. `.env.example` → `.env` - Configurar ambiente
3. `package.json` - Instalar deps

### 🔧 Para Desenvolver
1. `src/server.ts` - Entry point
2. `src/app.ts` - Configuração Express
3. `src/db/schema/domain.ts` - Modelos de dados
4. `src/modules/` - Lógica da aplicação

### 📊 Estrutura de Dados
- `src/db/schema/domain.ts` - Todos os schemas
- `src/modules/domain/services.ts` - Queries e lógica
- `src/db/migrations/` - Histórico de mudanças

### 🛣️ Rotas da API
- `src/modules/auth/auth.router.ts` - Auth
- `src/modules/domain/patients-professionals.router.ts` - Patients/Professionals
- `src/modules/domain/appointments.router.ts` - Appointments
- `src/modules/domain/medical-records.router.ts` - Medical Records
- `src/modules/domain/telemedicine.router.ts` - Telemedicine

### 🔐 Segurança
- `src/modules/auth/rbac.middleware.ts` - Autorização
- `src/shared/rate-limit.ts` - Rate limiting
- `src/shared/errors.ts` - Tratamento de erros

### ⚡ Performance
- `src/shared/redis.ts` - Cache e rate limit
- `src/db/schema/domain.ts` - Indexes do DB

### 📝 Testes
- `API_TESTS.md` - 80+ exemplos
- `API_REQUESTS.http` - VS Code REST Client
- `VERIFICATION_CHECKLIST.md` - Testes manuais

---

## 📊 Tamanho Aproximado

```
Arquivos de Código:       ~18 arquivos
Linhas de Código:         ~3.500+ linhas
Schemas Drizzle:          10 tabelas
Rotas da API:             40+ endpoints
Testes Documentados:      80+ exemplos
Documentação:             5 arquivos detalhados
```

---

## 🔄 Fluxo de Arquivos

```
Request HTTP
    ↓
app.ts (routing)
    ↓
*.router.ts (rota específica)
    ↓
authGuard + requireRole (middleware)
    ↓
*.controllers.ts (controllers)
    ↓
services.ts (business logic)
    ↓
db/schema/ + redis.ts (data layer)
    ↓
Response JSON
```

---

## 🎨 Patterns Utilizados

### MVC (Model-View-Controller)
```
schema/     ← Model (Drizzle)
controllers ← Controller (Express handlers)
routers     ← View (HTTP endpoints)
```

### Service Layer
```
routers → controllers → services → database
```

### Middleware
```
authGuard → requireRole → asyncHandler → controller
```

### Error Handling
```
try/catch → AppError → global error middleware
```

---

## 📦 Dependências Críticas

```json
{
  "express": "5.2.1",           // Web framework
  "drizzle-orm": "0.45.2",      // ORM
  "postgres": "3.4.9",          // Driver
  "socket.io": "4.7.2",         // Real-time
  "ioredis": "5.3.7",           // Cache
  "jsonwebtoken": "9.0.3",      // JWT
  "bcrypt": "6.0.0",            // Hashing
  "zod": "4.4.3",               // Validation
  "pdfkit": "0.14.0"            // PDF
}
```

---

## 🚀 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia em modo watch

# Build & Deploy
npm run build            # Compila TypeScript
npm start                # Inicia versão compilada

# Database
npm run db:generate      # Gera migrations
npm run db:migrate       # Aplica migrations
npm run db:studio        # GUI do banco

# Testing
npm run smoke            # Testes básicos
npm run smoke:all        # Todos os testes

# Linting
npm run lint             # ESLint
```

---

## 📚 Recursos Recomendados

### Documentação
- [Drizzle ORM](https://orm.drizzle.team/)
- [Express.js](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

### Ferramentas
- [Insomnia](https://insomnia.rest/) - API testing
- [DBeaver](https://dbeaver.io/) - DB management
- [VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

---

## 🎯 Next Steps

1. **Setup Local**
   - Instalar deps
   - Configurar .env
   - Rodar migrations
   - Iniciar servidor

2. **Testar**
   - Usar API_TESTS.md
   - Verificar VERIFICATION_CHECKLIST.md
   - Testar Socket.io

3. **Integrar Frontend**
   - Usar endpoints documentados
   - Socket.io client em React
   - CORS já configurado

4. **Deploy**
   - Build TypeScript
   - Configurar env vars
   - Rodar migrations em produção
   - Monitorar logs

---

## ✨ Features Implementadas

✅ RBAC (Role-Based Access Control)
✅ Patients & Professionals Management
✅ Specialties & Working Hours
✅ Appointment Scheduling com Availability
✅ Medical Records com Diagnoses & Prescriptions
✅ PDF Generation
✅ Telemedicine com Socket.io Real-Time
✅ Redis Cache Strategy
✅ Rate Limiting
✅ JWT Authentication
✅ Email Integration (esboço)

---

**Última atualização:** 5 de maio de 2026
**Status:** ✅ PRONTO PARA PRODUÇÃO

