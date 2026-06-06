import swaggerJsdoc from 'swagger-jsdoc'

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MindCare API',
      version: '1.0.0',
      description:
        'API do sistema de gerenciamento de clínica de saúde mental MindCare',
    },
    servers: [
      { url: 'http://localhost:3333', description: 'Desenvolvimento' },
      {
        url: 'https://mindcare-api.onrender.com',
        description: 'Produção (Render)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            role: {
              type: 'string',
              enum: ['patient', 'professional', 'admin'],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            name: { type: 'string' },
            cpf: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            phone: { type: 'string' },
            address: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        HealthProfessional: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            crm: { type: 'string' },
            specialtyId: { type: 'integer' },
            bio: { type: 'string' },
            avatar: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Specialty: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patientId: { type: 'integer' },
            professionalId: { type: 'integer' },
            scheduledStartTime: { type: 'string', format: 'date-time' },
            scheduledEndTime: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: [
                'requested',
                'scheduled',
                'confirmed',
                'rescheduled',
                'completed',
                'cancelled',
                'no_show',
              ],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        MedicalRecord: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            appointmentId: { type: 'integer' },
            patientId: { type: 'integer' },
            professionalId: { type: 'integer' },
            recordText: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            type: { type: 'string' },
            status: {
              type: 'string',
              enum: ['unread', 'read', 'archived'],
            },
            title: { type: 'string' },
            message: { type: 'string' },
            sentAt: { type: 'string', format: 'date-time' },
            readAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        AdminMetrics: {
          type: 'object',
          properties: {
            totalPatients: { type: 'integer' },
            totalProfessionals: { type: 'integer' },
            totalAppointments: { type: 'integer' },
            appointmentsLast30Days: { type: 'integer' },
            appointmentsByStatus: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
            totalUsers: { type: 'integer' },
          },
        },
      },
    },
    paths: {
      // ======================================================================
      // AUTH
      // ======================================================================
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar novo usuário',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'role'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    role: {
                      type: 'string',
                      enum: ['patient', 'professional', 'admin'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuário criado com sucesso' },
            409: {
              description: 'Email já cadastrado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            422: {
              description: 'Dados inválidos',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Autenticar usuário e obter token JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login bem-sucedido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      expiresIn: { type: 'integer' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Credenciais inválidas',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Obter dados do usuário autenticado',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Dados do usuário',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            401: {
              description: 'Não autenticado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },

      // ======================================================================
      // PATIENTS
      // ======================================================================
      '/api/patients': {
        get: {
          tags: ['Patients'],
          summary: 'Listar pacientes (admin)',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Lista de pacientes' },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão' },
          },
        },
        post: {
          tags: ['Patients'],
          summary: 'Criar ou atualizar perfil de paciente',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    cpf: { type: 'string' },
                    dateOfBirth: { type: 'string', format: 'date' },
                    phone: { type: 'string' },
                    address: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Perfil atualizado' },
            201: { description: 'Perfil criado' },
            401: { description: 'Não autenticado' },
          },
        },
        delete: {
          tags: ['Patients'],
          summary: 'Excluir paciente',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            204: { description: 'Paciente excluído' },
            401: { description: 'Não autenticado' },
            404: { description: 'Paciente não encontrado' },
          },
        },
      },
      '/api/patients/{id}': {
        get: {
          tags: ['Patients'],
          summary: 'Obter detalhes de um paciente',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Dados do paciente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Patient' },
                },
              },
            },
            401: { description: 'Não autenticado' },
            404: { description: 'Paciente não encontrado' },
          },
        },
      },

      // ======================================================================
      // PROFESSIONALS
      // ======================================================================
      '/api/professionals': {
        get: {
          tags: ['Professionals'],
          summary: 'Listar profissionais de saúde',
          responses: {
            200: { description: 'Lista de profissionais' },
          },
        },
        post: {
          tags: ['Professionals'],
          summary: 'Criar perfil de profissional',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['crm', 'specialtyId'],
                  properties: {
                    crm: { type: 'string' },
                    specialtyId: { type: 'integer' },
                    bio: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Profissional criado' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/professionals/{id}': {
        get: {
          tags: ['Professionals'],
          summary: 'Obter detalhes de um profissional',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Dados do profissional',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthProfessional' },
                },
              },
            },
            404: { description: 'Profissional não encontrado' },
          },
        },
      },
      '/api/professionals/link-patient': {
        post: {
          tags: ['Professionals'],
          summary: 'Vincular paciente a um profissional',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['professionalId', 'patientId'],
                  properties: {
                    professionalId: { type: 'integer' },
                    patientId: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Paciente vinculado' },
            401: { description: 'Não autenticado' },
          },
        },
      },

      // ======================================================================
      // SPECIALTIES
      // ======================================================================
      '/api/specialties': {
        get: {
          tags: ['Specialties'],
          summary: 'Listar especialidades',
          responses: {
            200: { description: 'Lista de especialidades' },
          },
        },
        post: {
          tags: ['Specialties'],
          summary: 'Criar especialidade (admin)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Especialidade criada' },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão' },
          },
        },
      },
      '/api/specialties/{id}': {
        put: {
          tags: ['Specialties'],
          summary: 'Atualizar especialidade (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Especialidade atualizada' },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão' },
          },
        },
        delete: {
          tags: ['Specialties'],
          summary: 'Excluir especialidade (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            204: { description: 'Especialidade excluída' },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão' },
          },
        },
      },

      // ======================================================================
      // APPOINTMENTS
      // ======================================================================
      '/api/appointments': {
        get: {
          tags: ['Appointments'],
          summary: 'Listar consultas do usuário autenticado',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Lista de consultas' },
            401: { description: 'Não autenticado' },
          },
        },
        post: {
          tags: ['Appointments'],
          summary: 'Solicitar nova consulta',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'professionalId', 'scheduledStartTime', 'scheduledEndTime'],
                  properties: {
                    patientId: { type: 'integer' },
                    professionalId: { type: 'integer' },
                    scheduledStartTime: { type: 'string', format: 'date-time' },
                    scheduledEndTime: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Consulta criada' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/appointments/{id}': {
        get: {
          tags: ['Appointments'],
          summary: 'Obter detalhes de uma consulta',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Dados da consulta',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Appointment' },
                },
              },
            },
            401: { description: 'Não autenticado' },
            404: { description: 'Consulta não encontrada' },
          },
        },
      },
      '/api/appointments/{id}/cancel': {
        patch: {
          tags: ['Appointments'],
          summary: 'Cancelar consulta',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: { description: 'Consulta cancelada' },
            401: { description: 'Não autenticado' },
            404: { description: 'Consulta não encontrada' },
          },
        },
      },
      '/api/appointments/{id}/confirm': {
        patch: {
          tags: ['Appointments'],
          summary: 'Confirmar consulta',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: { description: 'Consulta confirmada' },
            401: { description: 'Não autenticado' },
            404: { description: 'Consulta não encontrada' },
          },
        },
      },
      '/api/appointments/{id}/reschedule': {
        patch: {
          tags: ['Appointments'],
          summary: 'Reagendar consulta',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['scheduledStartTime', 'scheduledEndTime'],
                  properties: {
                    scheduledStartTime: { type: 'string', format: 'date-time' },
                    scheduledEndTime: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Consulta reagendada' },
            401: { description: 'Não autenticado' },
            404: { description: 'Consulta não encontrada' },
          },
        },
      },

      // ======================================================================
      // MEDICAL RECORDS
      // ======================================================================
      '/api/medical-records': {
        get: {
          tags: ['MedicalRecords'],
          summary: 'Listar prontuários do usuário autenticado',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Lista de prontuários' },
            401: { description: 'Não autenticado' },
          },
        },
        post: {
          tags: ['MedicalRecords'],
          summary: 'Criar prontuário',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['appointmentId', 'patientId', 'recordText'],
                  properties: {
                    appointmentId: { type: 'integer' },
                    patientId: { type: 'integer' },
                    recordText: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Prontuário criado' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/medical-records/{id}': {
        get: {
          tags: ['MedicalRecords'],
          summary: 'Obter detalhes de um prontuário',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Dados do prontuário',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MedicalRecord' },
                },
              },
            },
            401: { description: 'Não autenticado' },
            404: { description: 'Prontuário não encontrado' },
          },
        },
      },

      // ======================================================================
      // DOCUMENTS
      // ======================================================================
      '/api/documents': {
        get: {
          tags: ['Documents'],
          summary: 'Listar documentos do usuário autenticado',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Lista de documentos' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/documents/upload': {
        post: {
          tags: ['Documents'],
          summary: 'Fazer upload de documento',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Documento enviado' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/documents/{id}': {
        delete: {
          tags: ['Documents'],
          summary: 'Excluir documento',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            204: { description: 'Documento excluído' },
            401: { description: 'Não autenticado' },
            404: { description: 'Documento não encontrado' },
          },
        },
      },

      // ======================================================================
      // EMOTIONS
      // ======================================================================
      '/api/emotions': {
        get: {
          tags: ['Emotions'],
          summary: 'Listar registros de humor do paciente autenticado',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Lista de emoções' },
            401: { description: 'Não autenticado' },
          },
        },
        post: {
          tags: ['Emotions'],
          summary: 'Registrar humor',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['mood', 'intensity'],
                  properties: {
                    mood: { type: 'string' },
                    intensity: { type: 'integer', minimum: 1, maximum: 10 },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Emoção registrada' },
            401: { description: 'Não autenticado' },
          },
        },
      },

      // ======================================================================
      // DASHBOARD
      // ======================================================================
      '/api/dashboard/summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Obter resumo do dashboard do paciente',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Resumo do dashboard' },
            401: { description: 'Não autenticado' },
          },
        },
      },

      // ======================================================================
      // NOTIFICATIONS
      // ======================================================================
      '/api/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'Listar notificações do usuário autenticado',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['unread', 'read', 'archived'],
              },
            },
          ],
          responses: {
            200: { description: 'Lista de notificações' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/notifications/read-all': {
        patch: {
          tags: ['Notifications'],
          summary: 'Marcar todas as notificações como lidas',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Notificações marcadas como lidas' },
            401: { description: 'Não autenticado' },
          },
        },
      },
      '/api/notifications/{id}/read': {
        patch: {
          tags: ['Notifications'],
          summary: 'Marcar notificação como lida',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: { description: 'Notificação marcada como lida' },
            401: { description: 'Não autenticado' },
            404: { description: 'Notificação não encontrada' },
          },
        },
      },
      '/api/notifications/{id}/archive': {
        patch: {
          tags: ['Notifications'],
          summary: 'Arquivar notificação',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: { description: 'Notificação arquivada' },
            401: { description: 'Não autenticado' },
            404: { description: 'Notificação não encontrada' },
          },
        },
      },

      // ======================================================================
      // ADMIN
      // ======================================================================
      '/api/admin/metrics': {
        get: {
          tags: ['Admin'],
          summary: 'Obter métricas administrativas',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Métricas do sistema',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AdminMetrics' },
                },
              },
            },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão (admin apenas)' },
          },
        },
      },
      '/api/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'Listar usuários cadastrados (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 20 },
            },
          ],
          responses: {
            200: { description: 'Lista de usuários paginada' },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão (admin apenas)' },
          },
        },
      },
      '/api/admin/users/{id}': {
        delete: {
          tags: ['Admin'],
          summary: 'Excluir usuário (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            204: { description: 'Usuário excluído' },
            401: { description: 'Não autenticado' },
            403: { description: 'Sem permissão' },
            404: { description: 'Usuário não encontrado' },
          },
        },
      },
    },
  },
  apis: [],
})

export { swaggerSpec }
