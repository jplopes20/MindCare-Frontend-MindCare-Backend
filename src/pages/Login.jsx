import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { createProfessionalProfile } from '../services/professionals.js'

export default function Login() {
  const nav = useNavigate()
  const { login, register, error, clearError, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('patient')
  const [isRegister, setIsRegister] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [crm, setCrm] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [specialties, setSpecialties] = useState([])
  const [consentTerms, setConsentTerms] = useState([])
  const [acceptedConsents, setAcceptedConsents] = useState({})

  useEffect(() => {
    if (isRegister && role === 'professional') {
      fetch('/api/specialties')
        .then(r => {
          if (!r.ok) throw new Error('Falha ao carregar especialidades')
          return r.json()
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setSpecialties(data)
          }
        })
        .catch(() => {
          setSpecialties([])
        })
    }
  }, [isRegister, role])

  useEffect(() => {
    if (isRegister) {
      fetch('/api/consents/active')
        .then(r => r.json())
        .then(terms => {
          setConsentTerms(terms)
          const initial = {}
          terms.forEach(t => { initial[t.id] = false })
          setAcceptedConsents(initial)
        })
        .catch(() => {})
    }
  }, [isRegister])

  function roleRedirect(userRole) {
    if (userRole === 'professional') return '/professional'
    if (userRole === 'admin') return '/admin'
    return '/patient'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    clearError()
    setLocalError(null)

    if (!email || !password) {
      setLocalError('Preencha todos os campos')
      return
    }

    if (isRegister) {
      if (role === 'professional') {
        if (!crm || crm.length < 5) {
          setLocalError('Registro profissional deve ter no mínimo 5 caracteres')
          return
        }
        if (!specialtyId) {
          setLocalError('Selecione uma especialidade')
          return
        }
      }
      const allAccepted = Object.values(acceptedConsents).every(Boolean)
      if (!allAccepted) {
        setLocalError('Você precisa aceitar todos os termos de consentimento')
        return
      }
    }

    try {
      let user
      if (isRegister) {
        const consents = Object.entries(acceptedConsents).map(([id, accepted]) => ({
          consentTermId: Number(id),
          accepted,
        }))
        user = await register(email, password, role, consents)
        // Create professional profile after registration
        if (user?.role === 'professional') {
          try {
            await createProfessionalProfile({
              crm,
              specialtyId: Number(specialtyId),
            })
          } catch (profileErr) {
            setLocalError('Conta criada, mas erro ao criar perfil profissional.')
            return
          }
        }
      } else {
        user = await login(email, password)
      }
      nav(roleRedirect(user?.role), { replace: true })
    } catch (err) {
      if (err?.statusCode === 401) {
        setLocalError('Email ou senha inválidos')
      } else if (err?.statusCode === 409) {
        setLocalError('Este email já está cadastrado')
      } else if (err?.statusCode === 0) {
        setLocalError('Servidor indisponível. Verifique se o backend está rodando.')
      } else {
        setLocalError(err?.message || 'Erro ao autenticar')
      }
    }
  }

  const displayError = localError || error

  return (
    <div className="login-wrap card">
      <div className="brand">
        <div className="logo">MindCare</div>
        <div style={{ marginLeft: 6 }}>Plataforma de Saúde Mental</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>

        {isRegister && (
          <>
            <div className="form-group">
              <label>Tipo de acesso</label>
              <select value={role} onChange={(e) => { setRole(e.target.value); setLocalError(null) }}>
                <option value="patient">Paciente</option>
                <option value="professional">Profissional</option>
              </select>
            </div>
            {role === 'professional' && (
              <>
                <div className="form-group">
                  <label>Registro profissional</label>
                  <input
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="Ex: CRP 06/12345, CRM-SP 123456, CFP 12345"
                    minLength={5}
                  />
                </div>
                <div className="form-group">
                  <label>Especialidade</label>
                  <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                    <option value="">Selecione sua especialidade...</option>
                    {specialties.length > 0 ? (
                      specialties.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="1">Psicologia Clínica</option>
                        <option value="2">Psiquiatria</option>
                        <option value="3">Psicanálise</option>
                        <option value="4">Terapia Cognitivo-Comportamental (TCC)</option>
                        <option value="5">Neuropsicologia</option>
                        <option value="6">Psicopedagogia</option>
                        <option value="7">Terapia Ocupacional em Saúde Mental</option>
                        <option value="8">Outra</option>
                      </>
                    )}
                  </select>
                  {specialties.length === 0 && (
                    <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, display: 'block' }}>
                      Especialidades carregadas localmente. Conecte o servidor para mais opções.
                    </small>
                  )}
                </div>
              </>
            )}

            {consentTerms.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Termos de Consentimento</p>
                {consentTerms.map(term => (
                  <label key={term.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={!!acceptedConsents[term.id]}
                      onChange={(e) => setAcceptedConsents(prev => ({ ...prev, [term.id]: e.target.checked }))}
                      style={{ marginTop: 2 }}
                    />
                    <span>{term.description || term.title}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {displayError && (
          <div
            className="error-message"
            style={{ color: '#ff8a80', fontSize: 13, marginTop: 8 }}
          >
            {displayError}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
          }}
        >
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => {
                setIsRegister(!isRegister)
                clearError()
                setLocalError(null)
              }}
            >
              {isRegister ? 'Já tenho conta' : 'Criar conta'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
