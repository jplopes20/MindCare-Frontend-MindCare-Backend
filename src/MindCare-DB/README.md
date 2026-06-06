# 🏥 MindCare Backend - Sistema Completo de Telemedicina

Aplicação backend robusta e escalável para gerenciamento de consultas médicas com suporte a telemedicina em tempo real.

## 🎯 Tecnologias

- **Runtime:** Node.js (ES modules)
- **Framework:** Express.js
- **Database:** PostgreSQL + Drizzle ORM
- **Real-time:** Socket.io
- **Cache/Rate Limit:** Redis
- **Autenticação:** JWT + bcrypt
- **Validação:** Zod
- **PDF:** PDFKit
- **Linguagem:** TypeScript

## 📦 Funcionalidades Implementadas

### ✅ 1. RBAC (Role-Based Access Control)
- Middleware `requireRole` para autorização
- Roles: `patient`, `professional`, `admin`
- Validação em cada rota sensível

### ✅ 2. Patients e Health Professionals
- CRUD completo para pacientes e profissionais
- Schema com campos específicos de cada role
- Tabelas relacionadas via Foreign Keys

### ✅ 3. Specialties (Especialidades)
- Listagem pública
- CRUD protegido (admin)
- Associação com profissionais

### ✅ 4. Working Hours (Horários de Atendimento)
- Definição de dias e horários por profissional
- Validação de sobreposição de horários
- Gerenciamento por profissional e admin

### ✅ 5. Appointments (Consultas)
- Agendamento com verificação de disponibilidade
- Regras de cancelamento (penalidade se <24h)
- Slots de 30 minutos calculados dinamicamente
- Status: scheduled, completed, cancelled, no_show

### ✅ 6. Medical Records
- Prontuários associados a consultas
- Diagnósticos com código ICD-10 (CID)
- Prescrições com validade
- **Geração de PDF** para download

### ✅ 7. Telemedicine (Telemedicina)
- Salas de telemedicina com código único
- Chat em tempo real com Socket.io
- Status da sala: waiting, active, closed
- Histórico de mensagens no banco de dados

### ✅ 8. Redis Cache
- Cache de slots disponíveis (TTL: 5 min)
- Invalidação automática ao agendar/cancelar
- Rate limiting por IP/usuário (100 req/min)

### ✅ 9. Email (Esboço)
- Documentação para integração com Nodemailer
- Sugestões de templates e eventos
- Preparado para confirmação, lembretes, notificações

---

## 🚀 Quick Start

### 1. Clonar e Instalar
```bash
cd src/MindCare-DB
npm install
```

### 2. Configurar Ambiente
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 3. Banco de Dados
```bash
npm run db:generate   # Gera migrations
npm run db:migrate    # Aplica migrations
npm run db:studio     # Visualização (opcional)
```

### 4. Executar
```bash
npm run dev  # Modo desenvolvimento (porta 4000)
```

### 5. Testar
```bash
# Health check
curl http://localhost:4000/health

# Consulte API_TESTS.md para exemplos de requisições
```

---

## 📁 Estrutura de Diretórios

```
src/MindCare-DB/
├── src/
│   ├── app.ts                    # Configuração Express
│   ├── server.ts                 # Entry point + Socket.io
│   ├── db/
│   │   ├── index.ts              # Conexão Drizzle
│   │   ├── migrations/           # Migrations SQL
│   │   └── schema/
│   │       ├── index.ts          # Exports
│   │       ├── users.ts          # Schema de usuários
│   │       └── domain.ts         # Schemas de domínio
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.middleware.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── rbac.middleware.ts
│   │   ├── domain/
│   │   │   ├── schemas.ts               # Zod validation
│   │   │   ├── services.ts              # Business logic
│   │   │   ├── controllers.ts           # Controllers
│   │   │   ├── patients-professionals.router.ts
│   │   │   ├── appointments.router.ts
│   │   │   ├── appointments.controllers.ts
│   │   │   ├── medical-records.router.ts
│   │   │   ├── medical-records.controllers.ts
│   │   │   ├── telemedicine.router.ts
│   │   │   ├── telemedicine.controllers.ts
│   │   │   └── socket-handlers.ts       # Socket.io events
│   │   └── email/
│   │       └── email.notes.ts           # Esboço de implementação
│   └── shared/
│       ├── errors.ts             # Custom AppError
│       ├── validate.ts           # Zod parsing
│       ├── async-handler.ts      # Wrapper para async routes
│       ├── redis.ts              # Redis client + funções
│       └── rate-limit.ts         # Rate limit middleware
├── .env.example
├── .env                          # (ignorado pelo git)
├── package.json
├── drizzle.config.ts
├── tsconfig.json
└── API_TESTS.md                  # Exemplos de testes

```

---

## 🔑 Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mindcare_db

# JWT
JWT_SECRET=sua-chave-super-segura

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## 📡 Rotas Principais

### Auth
- `POST /auth/register` - Registrar
- `POST /auth/login` - Login

### Patients & Professionals
- `POST/GET/PUT /api/patients`
- `POST/GET/PUT /api/professionals`

### Specialties
- `GET /api/specialties`
- `POST/PUT/DELETE /api/specialties` (admin)

### Working Hours
- `POST/GET/PUT/DELETE /api/working-hours`

### Appointments
- `GET /api/appointments/available-slots?professionalId=1&date=2026-05-20`
- `POST /api/appointments`
- `POST /api/appointments/:id/cancel`

### Medical Records
- `POST/GET /api/medical-records`
- `POST /api/medical-records/:id/diagnoses`
- `POST /api/medical-records/:id/prescriptions`
- `GET /api/medical-records/:id/pdf` (download)

### Telemedicine
- `POST /api/telemedicine/rooms`
- `GET /api/telemedicine/rooms/:code`
- `GET /api/telemedicine/rooms/:code/messages`
- Socket.io: `join_room`, `send_message`, `leave_room`

---

## 🔐 Segurança

✅ **Autenticação**
- JWT com expiração
- Senha com bcrypt (salt: 10 rounds)

✅ **Autorização**
- RBAC por middleware
- Validação em cada endpoint

✅ **Proteção**
- Helmet para headers HTTP
- CORS configurável
- Rate limiting (100 req/min)

✅ **Validação**
- Zod schemas em todas as rotas
- Type-safe com TypeScript

---

## 📊 Banco de Dados

### Tabelas Principais

```
users (id, email, passwordHash, role, createdAt)
├─ patients (id, userId, cpf, phone, address, ...)
├─ health_professionals (id, userId, crm, specialtyId, bio, ...)
│  └─ specialties (id, name, description)
│  └─ working_hours (id, professionalId, weekday, startTime, endTime)
├─ appointments (id, patientId, professionalId, status, ...)
│  └─ medical_records (id, appointmentId, patientId, recordText, ...)
│     ├─ diagnoses (id, recordId, cidCode, description)
│     └─ prescriptions (id, recordId, medication, dosage, ...)
└─ telemedicine_rooms (id, appointmentId, roomCode, status)
   └─ telemedicine_messages (id, roomId, userId, content)
```

### Relacionamentos

- Users → Patients (1-to-1)
- Users → HealthProfessionals (1-to-1)
- HealthProfessionals → Specialties (N-to-1)
- HealthProfessionals → WorkingHours (1-to-Many)
- Patients → Appointments (1-to-Many)
- HealthProfessionals → Appointments (1-to-Many)
- Appointments → MedicalRecords (1-to-Many)
- MedicalRecords → Diagnoses (1-to-Many)
- MedicalRecords → Prescriptions (1-to-Many)
- Appointments → TelemedicineRooms (1-to-1)
- TelemedicineRooms → TelemedicineMessages (1-to-Many)

---

## 🔄 Fluxo de Uma Consulta Completa

```
1. Paciente vê especialidades
   GET /api/specialties

2. Paciente lista profissionais
   GET /api/professionals

3. Paciente verifica disponibilidade
   GET /api/appointments/available-slots?professionalId=1&date=2026-05-20
   [Cache Redis: 5 min]

4. Paciente agenda consulta
   POST /api/appointments
   [Cache invalidado]

5. Sala de telemedicina criada
   POST /api/telemedicine/rooms

6. Chat em tempo real durante consulta
   Socket.io: join_room → send_message ↔ receive_message

7. Profissional cria prontuário
   POST /api/medical-records

8. Adiciona diagnósticos
   POST /api/medical-records/1/diagnoses

9. Adiciona prescrições
   POST /api/medical-records/1/prescriptions

10. Gera PDF para arquivo
    GET /api/medical-records/1/pdf

11. Paciente pode cancelar (se < 24h: penalidade)
    POST /api/appointments/1/cancel
    [Cache invalidado]
```

---

## 🧪 Testando no Insomnia

Veja [API_TESTS.md](./API_TESTS.md) para exemplos completos de requisições para cada endpoint.

### Quick Test
```bash
# 1. Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123","role":"patient"}'

# 2. Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123"}'

# 3. Health
curl http://localhost:4000/health
```

---

## 💡 Funcionalidades Avançadas

### Cache com Redis
- Slots disponíveis cacheados por 5 minutos
- Invalidação automática ao agendar/cancelar
- Rate limiting: 100 requisições/minuto

### PDF Generation
- Gera PDF completo do prontuário
- Inclui diagnósticos e prescrições
- Download via endpoint

### Socket.io Real-time
- Chat durante teleconsulta
- Notificações de join/leave
- Persistência de mensagens

### Validação de Disponibilidade
- Verifica working_hours
- Evita conflitos de horários
- Slots dinâmicos de 30 min

### Regras de Cancelamento
- Sem penalidade: ≥ 24h
- Com penalidade: < 24h
- Não permite após consulta

---

## 🚧 Implementações Futuras

- [ ] **Email:** Integração com Nodemailer/SendGrid
  - Confirmação de consulta
  - Lembretes 24h antes
  - Notificação de cancelamento
  
- [ ] **Agendamento:** Node-cron para lembretes automáticos

- [ ] **Videochamada:** Integração Twilio/Jitsi

- [ ] **Notificações:** Firebase Cloud Messaging

- [ ] **Dashboard:** Admin panel React

- [ ] **Avaliações:** Sistema de ratings

- [ ] **Documentos:** Upload de exames/documentos

- [ ] **Webhooks:** Eventos para integrações

---

## 🤝 Contribuindo

1. Crie branch: `git checkout -b feature/nova-feature`
2. Commit: `git commit -m "Add nova feature"`
3. Push: `git push origin feature/nova-feature`
4. Pull Request

---

## 📄 Licença

ISC

---

## 📞 Suporte

Para questões ou issues:
1. Verificar [API_TESTS.md](./API_TESTS.md)
2. Conferir logs no console
3. Consultar documentação das libs (Drizzle, Express, Socket.io)

---

## 📚 Referências

- [Drizzle ORM](https://orm.drizzle.team/)
- [Express.js](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [TypeScript](https://www.typescriptlang.org/)

## Testes

```bash
# Rodar todos os testes
npm test

# Rodar em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

