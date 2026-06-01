# 🏗️ Arquitetura do Sistema - MindCare Backend

## 📊 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Frontend)                    │
│                      React / Vue / Mobile                       │
└────────────────┬────────────────────────────────┬───────────────┘
                 │ HTTP/REST                       │ WebSocket
                 ↓                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Express.js Application Server                │   │
│  │  PORT: 4000 | CORS: http://localhost:3000             │   │
│  │  Routes: /auth, /api/*, /health                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ↓ Middleware        ↓ Real-time            ↓ Cache/Rate-Limit
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  MIDDLEWARE      │   │   SOCKET.IO      │   │     REDIS        │
│  ────────────    │   │   ──────────     │   │   ────────       │
│ • authGuard      │   │ • join_room      │   │ • Cache: 5 min   │
│ • requireRole    │   │ • send_message   │   │ • Rate: 100 r/m  │
│ • asyncHandler   │   │ • receive_msg    │   │ • Store: sessions│
│ • error handling │   │ • leave_room     │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
         │                     │                      │
         └─────────────────────┼──────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│               BUSINESS LOGIC LAYER (Services)                   │
│  ┌──────────────┬──────────────┬──────────────────────┐        │
│  │ Auth Service │ Domain       │ Medical Records      │        │
│  │ ──────────── │ Service      │ Service              │        │
│  │ • register   │ ────────     │ ────────────         │        │
│  │ • login      │ • patients   │ • create records     │        │
│  │ • JWT        │ • prof's     │ • add diagnosis      │        │
│  │ • bcrypt     │ • spec's     │ • prescriptions      │        │
│  │              │ • hours      │ • PDF generation     │        │
│  │              │ • appt.ment  │ • availability cache │        │
│  │              │   (cache!)   │   (cache invalidate) │        │
│  └──────────────┴──────────────┴──────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│               DATA ACCESS LAYER (Drizzle ORM)                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Query Builder + Type-Safe Queries               │           │
│  │  Relationships: Patients → Appointments →        │           │
│  │                 Medical Records → Diagnoses      │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
         │                         │
         ↓                         ↓
    ┌─────────────────┐    ┌──────────────────┐
    │   PostgreSQL    │    │     Redis        │
    │   Database      │    │     Cache        │
    │ ────────────    │    │ ────────────     │
    │ • 10 Tables     │    │ • Slots cache    │
    │ • 20+ Indexes   │    │ • Rate limit     │
    │ • Relationships │    │ • Sessions       │
    │ • Check         │    └──────────────────┘
    │   Constraints   │
    └─────────────────┘
```

---

## 🗄️ Modelo de Dados (Drizzle Schema)

```
                         ┌─────────────┐
                         │    USERS    │
                         ├─────────────┤
                         │ id (PK)     │
                         │ email (UQ)  │
                         │ password    │
                         │ role (enum) │
                         │ createdAt   │
                         └──────┬──────┘
                  ┌──────────────┼──────────────┐
                  ↓              ↓              ↓
           ┌──────────────┐ ┌──────────────────────┐
           │  PATIENTS    │ │ HEALTH_PROFESSIONALS │
           ├──────────────┤ ├──────────────────────┤
           │ id (PK)      │ │ id (PK)              │
           │ userId (FK)  │ │ userId (FK)          │
           │ cpf          │ │ crm                  │
           │ dob          │ │ specialtyId (FK)  ──┐
           │ phone        │ │ licenseExpiry        │
           │ address      │ │ bio                  │
           └──────┬───────┘ └──────┬───────────────┘
                  │                │
                  │ 1:M            │ 1:M
                  │                │
                  ↓                ↓
          ┌──────────────────────────────────┐
          │      APPOINTMENTS                │
          ├──────────────────────────────────┤
          │ id (PK)                          │
          │ patientId (FK)                   │
          │ professionalId (FK)              │
          │ scheduledStartTime               │
          │ scheduledEndTime                 │
          │ status (enum)                    │
          │ cancellationReason               │
          │ hasCancellationPenalty           │
          └──────┬─────────────────┬─────────┘
                 │                 │
                 │ 1:M             │ 1:1
                 │                 │
                 ↓                 ↓
        ┌─────────────────┐  ┌──────────────────────┐
        │ MEDICAL_RECORDS │  │ TELEMEDICINE_ROOMS   │
        ├─────────────────┤  ├──────────────────────┤
        │ id (PK)         │  │ id (PK)              │
        │ appointmentId   │  │ appointmentId (FK)   │
        │ patientId (FK)  │  │ roomCode (UQ)        │
        │ profId (FK)     │  │ status (enum)        │
        │ recordText      │  │ createdAt            │
        │ recordDateTime  │  │ closedAt             │
        └────┬──┬─────────┘  └──────┬───────────────┘
             │ │ 1:M                │
             │ │                    │ 1:M
             │ │                    │
      ┌──────┘ │            ┌───────↓────────────────┐
      │        │            │ TELEMEDICINE_MESSAGES  │
      ↓        ↓            ├────────────────────────┤
  ┌─────────┐┌────────────┐ │ id (PK)                │
  │DIAGNOSES││PRESCRIPTIONS │ roomId (FK)            │
  ├─────────┤├────────────┤ │ userId (FK)            │
  │ id (PK) ││ id (PK)     │ │ content                │
  │ recId(FK)│ recId (FK)  │ │ createdAt              │
  │ cidCode ││ medication │ └────────────────────────┘
  │ description
  │ dosage   │
  │ instructions
  │ validity │
  └─────────┘└────────────┘

       +─────────────────────┐
       │    SPECIALTIES      │
       ├─────────────────────┤
       │ id (PK)             │
       │ name (UQ)           │
       │ description         │
       └─────────────────────┘
                ↑ 1:M
                │
           ┌────┴─────────────────────┐
           │  WORKING_HOURS           │
           ├──────────────────────────┤
           │ id (PK)                  │
           │ healthProfessionalId(FK) │
           │ weekday (0-6)            │
           │ startTime (HH:MM)        │
           │ endTime (HH:MM)          │
           │ isActive                 │
           └──────────────────────────┘
```

---

## 🔄 Fluxo de Uma Requisição HTTP

```
1. CLIENT
   ↓
   POST /api/appointments
   Authorization: Bearer {JWT}
   {
     "professionalId": 1,
     "scheduledStartTime": "2026-05-20T14:00:00Z",
     "scheduledEndTime": "2026-05-20T14:30:00Z"
   }

2. SERVER - Middlewares
   ├─ app.use(helmet())           ← Security headers
   ├─ app.use(cors())              ← CORS check
   ├─ app.use(express.json())      ← Parse JSON
   └─ authGuard()                  ← Verify JWT token
      └─ requireRole(['patient'])  ← Check role
         └─ asyncHandler()         ← Catch errors

3. ROUTE MATCHING
   appointmentsRouter
   POST /appointments
   → appointmentsControllers.createAppointmentController()

4. CONTROLLER
   ├─ parseBody(schema)            ← Zod validation
   ├─ getPatientByUserId()         ← Get patient
   └─ services.createAppointment()

5. SERVICE (Business Logic)
   ├─ Check time validity
   ├─ getAvailableSlots()
   │  ├─ Check cache (Redis)       ← HIT? Return cached
   │  ├─ Query workingHours
   │  ├─ Query appointments
   │  ├─ Calculate slots
   │  └─ Cache result (5 min)
   ├─ Verify slot availability
   └─ db.insert(appointments)

6. DATABASE (Drizzle ORM)
   ├─ SQL INSERT query
   │  INSERT INTO appointments (...)
   │  VALUES (...)
   │  RETURNING *;
   ├─ PostgreSQL executes
   └─ Return created record

7. SERVICE (Continued)
   ├─ Invalidate cache ← IMPORTANT!
   │  redis.del(cache_key)
   └─ Return appointment

8. CONTROLLER
   ├─ res.status(201)
   └─ res.json(appointment)

9. MIDDLEWARE - Error Handling
   (if error occurs at any step)
   ├─ catch(error)
   ├─ if (AppError) → res.status(...).json({error})
   └─ else → res.status(500).json({error})

10. CLIENT RESPONSE
    ✅ Status: 201 Created
    {
      "id": 42,
      "patientId": 1,
      "professionalId": 1,
      "scheduledStartTime": "2026-05-20T14:00:00Z",
      "scheduledEndTime": "2026-05-20T14:30:00Z",
      "status": "scheduled",
      "createdAt": "2026-05-05T10:30:45.123Z"
    }
```

---

## 🔐 Fluxo de Autenticação

```
REGISTER
  ↓
  POST /auth/register
  { email, password, role }
  ↓
  • Validate with Zod
  • Hash password: bcrypt.hash(password, 10)
  • Insert into users table
  • Generate JWT token
  ↓
  ✅ Return { id, email, role, token }

LOGIN
  ↓
  POST /auth/login
  { email, password }
  ↓
  • Find user by email
  • Compare password: bcrypt.compare(password, hash)
  • Generate JWT token
  ↓
  ✅ Return { id, email, role, token }

USE TOKEN
  ↓
  GET /api/patients/me
  Authorization: Bearer {token}
  ↓
  • Extract token from header
  • Verify signature: jwt.verify(token, secret)
  • Decode payload: { userId, email, role }
  • Set req.user = payload
  ↓
  ✅ Proceed to route handler
  ❌ 401 Unauthorized (if invalid)

RBAC CHECK
  ↓
  POST /api/specialties
  Authorization: Bearer {token}
  [requireRole(['admin'])]
  ↓
  • Check req.user.role
  • Is 'admin'? → Continue
  • Not 'admin'? → 403 Forbidden
  ↓
  ✅ Proceed / ❌ Reject
```

---

## ⚡ Fluxo de Cache com Redis

```
REQUEST 1: Get Available Slots
┌─────────────────────────────────────────────┐
│ GET /api/appointments/available-slots       │
│ ?professionalId=1&date=2026-05-20           │
└─────────────────────────────────────────────┘
  ↓
  getAvailableSlotsFromCache(1, '2026-05-20')
  ↓
  redis.get('available_slots:1:2026-05-20')
  ↓
  ❌ KEY NOT FOUND
  ↓
  Query database:
  • SELECT from working_hours
  • SELECT from appointments
  • Calculate slots
  ↓
  cacheAvailableSlots(1, '2026-05-20', slots)
  ↓
  redis.setex('available_slots:1:2026-05-20', 300, JSON.stringify(slots))
  ↓
  ✅ Return slots (and cached for next 5 min)

REQUEST 2 (within 5 min): Get Available Slots (same prof, same date)
┌─────────────────────────────────────────────┐
│ GET /api/appointments/available-slots       │
│ ?professionalId=1&date=2026-05-20           │
└─────────────────────────────────────────────┘
  ↓
  getAvailableSlotsFromCache(1, '2026-05-20')
  ↓
  redis.get('available_slots:1:2026-05-20')
  ↓
  ✅ KEY FOUND!
  ↓
  ✅ Return cached slots (no DB query!)
  ↓
  ⏱️ Response time: ~5ms instead of 200ms

APPOINTMENT CREATED: Invalidate Cache
┌─────────────────────────────────────────────┐
│ POST /api/appointments                      │
│ (slot for professionalId=1 on 2026-05-20)  │
└─────────────────────────────────────────────┘
  ↓
  services.createAppointment()
  ↓
  • Insert into DB
  ✓ Success
  ↓
  • Invalidate cache:
    invalidateAvailableSlotsCache(1, '2026-05-20')
  ↓
  redis.del('available_slots:1:2026-05-20')
  ↓
  ✅ Cache cleared
  ↓
  Next request will recalculate slots with new appointment
```

---

## 🌐 Fluxo de Socket.io - Telemedicina

```
CLIENTE (Paciente)                    SERVIDOR                      CLIENTE (Profissional)

1. Conectar
   io.connect()                   ←→  server.listen()
        ↓

2. Entrar na Sala
   emit('join_room')               →  socket.on('join_room')
   { roomCode, user }                 ├─ Update status: waiting → active
                                      ├─ emit to room: 'user_joined'
                                      └─ Save in DB
        ↓                                          ↓
   on('joined_room')              ←  Confirmação de entrada
        ↓

3. Chat em Tempo Real
   emit('send_message')            →  socket.on('send_message')
   { roomCode, content, user }        ├─ Save in DB
                                      ├─ emit to room: 'receive_message'
        ↓ broadcast                   ↓
   on('receive_message')           ←  Todos recebem
   (todos na sala)                    (incluindo o sender)
        ↓

4. Sair da Sala
   emit('leave_room')              →  socket.on('leave_room')
   { roomCode, user }                 └─ emit to room: 'user_left'
        ↓
   on('user_left')                 ←  Notificação
        ↓

5. Status da Sala
   (opcional)                      ←→ Update status:
   on('room_status_changed')           waiting
                                       active
                                       closed
```

---

## 🏗️ Padrões de Design Utilizados

```
┌─────────────────────────────────┐
│ Architecture Patterns           │
├─────────────────────────────────┤
│ MVC (Model-View-Controller)     │
│ Service Layer Pattern            │
│ Middleware Pipeline              │
│ Repository Pattern (Drizzle)     │
│ Singleton (DB client, Redis)     │
│ Strategy (Error handling)        │
│ Factory (Service creation)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Code Organization               │
├─────────────────────────────────┤
│ Separation of Concerns           │
│ Single Responsibility            │
│ DRY (Don't Repeat Yourself)     │
│ SOLID Principles                 │
│ Type Safety (TypeScript)         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Data Flow                       │
├─────────────────────────────────┤
│ Request → Middleware             │
│ → Validation → Service           │
│ → Database → Response            │
│ ← Cache (if applicable)          │
└─────────────────────────────────┘
```

---

## 📈 Performance Optimizations

```
┌─────────────────────────────────┐
│ Database                        │
├─────────────────────────────────┤
│ ✅ 20+ Indexes                  │
│ ✅ Foreign keys                 │
│ ✅ Check constraints            │
│ ✅ Query optimization           │
│ ✅ Lazy loading (relations)     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Caching                         │
├─────────────────────────────────┤
│ ✅ Redis cache (5 min TTL)      │
│ ✅ Cache invalidation strategy  │
│ ✅ Rate limiting (100 req/min)  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ API                             │
├─────────────────────────────────┤
│ ✅ Async/await handling         │
│ ✅ Connection pooling           │
│ ✅ Error recovery               │
│ ✅ Request validation           │
└─────────────────────────────────┘
```

---

**Última atualização:** 5 de maio de 2026
**Versão:** 1.0 - Production Ready ✅

