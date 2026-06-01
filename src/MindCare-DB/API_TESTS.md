# MindCare Backend - Documentação de Testes

## Setup Inicial

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Inicializar banco de dados
npm run db:generate
npm run db:migrate

# 4. Iniciar servidor em desenvolvimento
npm run dev
```

## Variáveis de Ambiente Necessárias

```
DATABASE_URL=postgresql://user:password@localhost:5432/mindcare_db
JWT_SECRET=sua-chave-super-segura
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

---

## 📋 Testes no Insomnia

### 1️⃣ AUTENTICAÇÃO

#### 1.1 - Registrar Novo Usuário (Paciente)
```
POST http://localhost:4000/auth/register
Content-Type: application/json

{
  "email": "paciente@example.com",
  "password": "senha123",
  "role": "patient"
}
```
**Resposta esperada:**
```json
{
  "id": 1,
  "email": "paciente@example.com",
  "role": "patient",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 1.2 - Registrar Profissional de Saúde
```
POST http://localhost:4000/auth/register
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "senha123",
  "role": "professional"
}
```

#### 1.3 - Login
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "paciente@example.com",
  "password": "senha123"
}
```
**Salve o token retornado para usar nas próximas requisições como Bearer Token**

---

### 2️⃣ PATIENTS E PROFESSIONALS

#### 2.1 - Criar Perfil de Paciente (Com autenticação)
```
POST http://localhost:4000/api/patients
Authorization: Bearer {TOKEN_DO_PACIENTE}
Content-Type: application/json

{
  "cpf": "12345678901",
  "dateOfBirth": "1990-05-15T00:00:00Z",
  "phone": "11999999999",
  "address": "Rua Exemplo, 123, São Paulo, SP"
}
```

#### 2.2 - Obter Meu Perfil de Paciente
```
GET http://localhost:4000/api/patients/me
Authorization: Bearer {TOKEN_DO_PACIENTE}
```

#### 2.3 - Atualizar Perfil de Paciente
```
PUT http://localhost:4000/api/patients/me
Authorization: Bearer {TOKEN_DO_PACIENTE}
Content-Type: application/json

{
  "phone": "11988888888",
  "address": "Nova Rua, 456"
}
```

#### 2.4 - Criar Perfil de Profissional
```
POST http://localhost:4000/api/professionals
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
Content-Type: application/json

{
  "crm": "123456/SP",
  "specialtyId": 1,
  "bio": "Médico formado pela USP com 10 anos de experiência"
}
```

#### 2.5 - Listar Profissionais (Público)
```
GET http://localhost:4000/api/professionals
```

#### 2.6 - Obter Profissional por ID (Público)
```
GET http://localhost:4000/api/professionals/1
```

---

### 3️⃣ SPECIALTIES

#### 3.1 - Listar Especialidades (Público)
```
GET http://localhost:4000/api/specialties
```

#### 3.2 - Criar Especialidade (Admin)
```
POST http://localhost:4000/api/specialties
Authorization: Bearer {TOKEN_DO_ADMIN}
Content-Type: application/json

{
  "name": "Cardiologia",
  "description": "Especialidade que estuda e trata doenças do coração"
}
```

---

### 4️⃣ WORKING HOURS

#### 4.1 - Criar Horário de Trabalho (Profissional)
```
POST http://localhost:4000/api/working-hours
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
Content-Type: application/json

{
  "weekday": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "isActive": true
}
```
**Nota:** weekday: 0=Domingo, 1=Segunda, ..., 6=Sábado

#### 4.2 - Obter Meus Horários de Trabalho
```
GET http://localhost:4000/api/working-hours/me
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
```

#### 4.3 - Obter Horários de um Profissional (Público)
```
GET http://localhost:4000/api/working-hours/professional/1
```

#### 4.4 - Atualizar Horário de Trabalho
```
PUT http://localhost:4000/api/working-hours/1
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
Content-Type: application/json

{
  "startTime": "08:00",
  "endTime": "16:00"
}
```

---

### 5️⃣ APPOINTMENTS

#### 5.1 - Obter Slots Disponíveis (Público)
```
GET http://localhost:4000/api/appointments/available-slots?professionalId=1&date=2026-05-20
```
**Query params:**
- `professionalId`: ID do profissional
- `date`: Data em formato YYYY-MM-DD
- Retorna slots de 30 minutos disponíveis

#### 5.2 - Criar Consulta (Paciente)
```
POST http://localhost:4000/api/appointments
Authorization: Bearer {TOKEN_DO_PACIENTE}
Content-Type: application/json

{
  "professionalId": 1,
  "scheduledStartTime": "2026-05-20T14:00:00Z",
  "scheduledEndTime": "2026-05-20T14:30:00Z"
}
```
**Nota:** Sistema verifica disponibilidade automaticamente

#### 5.3 - Obter Minhas Consultas
```
GET http://localhost:4000/api/appointments/me
Authorization: Bearer {TOKEN_DO_PACIENTE}
```

#### 5.4 - Cancelar Consulta (Paciente/Profissional)
```
POST http://localhost:4000/api/appointments/1/cancel
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "cancellationReason": "Conflito com outro compromisso"
}
```
**Regras de cancelamento:**
- < 24h antes: marca com penalidade
- ≥ 24h: sem penalidade
- Após a consulta: não pode cancelar

---

### 6️⃣ MEDICAL RECORDS

#### 6.1 - Criar Prontuário (Profissional)
```
POST http://localhost:4000/api/medical-records
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
Content-Type: application/json

{
  "patientId": 1,
  "appointmentId": 1,
  "recordText": "Paciente apresenta sintomas de gripe. Prescrever repouso e antibiótico conforme indicação."
}
```

#### 6.2 - Obter Prontuário por ID
```
GET http://localhost:4000/api/medical-records/1
Authorization: Bearer {TOKEN}
```

#### 6.3 - Obter Meus Prontuários (Paciente)
```
GET http://localhost:4000/api/medical-records/me
Authorization: Bearer {TOKEN_DO_PACIENTE}
```

#### 6.4 - Adicionar Diagnóstico
```
POST http://localhost:4000/api/medical-records/1/diagnoses
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
Content-Type: application/json

{
  "cidCode": "J10.0",
  "description": "Influenza"
}
```

#### 6.5 - Adicionar Prescrição
```
POST http://localhost:4000/api/medical-records/1/prescriptions
Authorization: Bearer {TOKEN_DO_PROFESSIONAL}
Content-Type: application/json

{
  "medication": "Amoxicilina",
  "dosage": "500mg",
  "instructions": "Tomar 1 comprimido a cada 8 horas, por 7 dias",
  "validity": "2026-06-05T00:00:00Z"
}
```

#### 6.6 - Gerar PDF do Prontuário
```
GET http://localhost:4000/api/medical-records/1/pdf
Authorization: Bearer {TOKEN}
```
**Retorna:** Arquivo PDF para download

---

### 7️⃣ TELEMEDICINE

#### 7.1 - Criar Sala de Telemedicina
```
POST http://localhost:4000/api/telemedicine/rooms
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "appointmentId": 1
}
```
**Resposta:**
```json
{
  "id": 1,
  "appointmentId": 1,
  "roomCode": "ABC12345",
  "status": "waiting",
  "createdAt": "2026-05-20T10:00:00Z"
}
```

#### 7.2 - Obter Informações da Sala
```
GET http://localhost:4000/api/telemedicine/rooms/ABC12345
Authorization: Bearer {TOKEN}
```

#### 7.3 - Obter Mensagens da Sala
```
GET http://localhost:4000/api/telemedicine/rooms/ABC12345/messages
Authorization: Bearer {TOKEN}
```

#### 7.4 - Atualizar Status da Sala
```
PUT http://localhost:4000/api/telemedicine/rooms/ABC12345/status
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "status": "active"
}
```
**Status válidos:** `waiting`, `active`, `closed`

---

## 🔌 Socket.io - Chat em Tempo Real

### Conectar ao Socket.io
```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:4000', {
  transports: ['websocket'],
  reconnection: true,
})

// Entrar em uma sala
socket.emit('join_room', {
  roomCode: 'ABC12345',
  user: {
    userId: 1,
    email: 'paciente@example.com',
    role: 'patient'
  }
})

// Enviar mensagem
socket.emit('send_message', {
  roomCode: 'ABC12345',
  content: 'Olá, como você está?',
  user: {
    userId: 1,
    email: 'paciente@example.com',
    role: 'patient'
  }
})

// Receber mensagem
socket.on('receive_message', (data) => {
  console.log(`${data.user.email}: ${data.content}`)
})

// Sair da sala
socket.emit('leave_room', {
  roomCode: 'ABC12345',
  user: { userId: 1, email: 'paciente@example.com', role: 'patient' }
})
```

---

## 📊 Fluxo Completo de Uma Consulta

1. **Paciente vê especialidades** → GET /specialties
2. **Paciente lista profissionais** → GET /professionals
3. **Paciente verifica horários disponíveis** → GET /appointments/available-slots
4. **Paciente agenda consulta** → POST /appointments *(cache de slots invalidado)*
5. **Profissional recebe notificação** → GET /appointments/me
6. **Criar sala de telemedicina** → POST /telemedicine/rooms
7. **Durante consulta: chat em tempo real** → Socket.io events
8. **Profissional cria prontuário** → POST /medical-records
9. **Adicionar diagnósticos/prescrições** → POST /diagnoses, /prescriptions
10. **Gerar PDF do prontuário** → GET /medical-records/1/pdf
11. **Paciente pode cancelar** → POST /appointments/1/cancel *(se < 24h: penalidade)*

---

## 🔐 Segurança

- ✅ Hash de senhas com bcrypt
- ✅ JWT para autenticação
- ✅ RBAC (Role-Based Access Control)
- ✅ Rate limiting com Redis
- ✅ CORS configurável
- ✅ Helmet para headers de segurança

---

## 📝 Estrutura de Rotas

```
/auth
  POST /register          - Registrar novo usuário
  POST /login            - Autenticar

/api/patients
  POST /                 - Criar perfil (paciente)
  GET /me               - Meu perfil (paciente)
  PUT /me               - Atualizar perfil (paciente)
  GET /:id              - Ver paciente (se paciente: só si mesmo; admin: todos)
  DELETE /:id           - Deletar (paciente/admin)
  GET /                 - Listar (admin)

/api/professionals
  POST /                - Criar perfil (professional)
  GET /me              - Meu perfil (professional)
  PUT /me              - Atualizar perfil (professional)
  GET /:id             - Ver profissional (público)
  DELETE /:id          - Deletar (professional/admin)
  GET /                - Listar (público)

/api/specialties
  GET /                - Listar (público)
  GET /:id             - Ver (público)
  POST /               - Criar (admin)
  PUT /:id             - Atualizar (admin)
  DELETE /:id          - Deletar (admin)

/api/working-hours
  GET /me              - Meus horários (professional)
  GET /professional/:id - Horários de profissional (público)
  POST /               - Criar (professional)
  PUT /:id             - Atualizar (professional/admin)
  DELETE /:id          - Deletar (professional/admin)

/api/appointments
  GET /available-slots - Slots disponíveis (público, query: professionalId, date)
  GET /me              - Minhas consultas (paciente/professional)
  GET /:id             - Consulta (autenticado)
  POST /               - Agendar (paciente)
  POST /:id/cancel     - Cancelar (paciente/professional)

/api/medical-records
  POST /               - Criar (professional)
  GET /:id             - Ver (paciente/professional/admin)
  GET /me              - Meus prontuários (paciente)
  POST /:id/diagnoses  - Adicionar diagnóstico (professional)
  POST /:id/prescriptions - Adicionar prescrição (professional)
  GET /:id/pdf         - Gerar PDF (autenticado)

/api/telemedicine
  POST /rooms          - Criar sala (autenticado)
  GET /rooms/:code     - Info da sala (autenticado)
  PUT /rooms/:code/status - Atualizar status (autenticado)
  GET /rooms/:code/messages - Listar mensagens (autenticado)
  POST /rooms/:code/messages - Enviar mensagem (autenticado)
```

---

## ✨ Próximas Implementações

- [ ] Integração com Nodemailer (confirmação, lembretes, notificações)
- [ ] Agendamento de lembretes com node-cron
- [ ] Webhooks para eventos importantes
- [ ] Upload de documentos para prontuários
- [ ] Dashboard de admin
- [ ] Sistema de avaliações/ratings
- [ ] Notificações push (Firebase Cloud Messaging)
- [ ] Integração com videochamada (Twilio, Jitsi)

---

## 🐛 Troubleshooting

**"Database connection error"**
→ Verificar `DATABASE_URL` no .env e se PostgreSQL está rodando

**"Redis connection error"**
→ Verificar se Redis está instalado e rodando em `REDIS_HOST:REDIS_PORT`

**"JWT verification failed"**
→ Token expirou ou JWT_SECRET inválida

**"Rate limit exceeded"**
→ Aguardar 1 minuto ou usar IP diferente

