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

  useEffect(() => {
    if (isRegister && role === 'professional') {
      fetch('/api/specialties')
        .then(r => r.json())
        .then(setSpecialties)
        .catch(() => {})
    }
  }, [isRegister, role])

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

    if (isRegister && role === 'professional') {
      if (!crm || crm.length < 5) {
        setLocalError('CRM deve ter no mínimo 5 caracteres')
        return
      }
      if (!specialtyId) {
        setLocalError('Selecione uma especialidade')
        return
      }
    }

    try {
      let user
      if (isRegister) {
        user = await register(email, password, role)
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
                  <label>CRM</label>
                  <input
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="Nº do conselho regional"
                    minLength={5}
                  />
                </div>
                <div className="form-group">
                  <label>Especialidade</label>
                  <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
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
