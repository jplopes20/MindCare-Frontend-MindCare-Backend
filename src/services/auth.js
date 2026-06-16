import { request, setToken, setStoredUser, getStoredUser } from './api.js'

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
    useAuth: false,
  })

  if (data.token) {
    setToken(data.token)
  }

  const user = data.user || { email, role: data.role || 'patient' }
  setStoredUser(user)
  return user
}

export async function register(email, password, role = 'patient', consents = []) {
  await request('/auth/register', {
    method: 'POST',
    body: { email, password, role, consents },
    useAuth: false,
  })

  // Backend doesn't return a token on register, so auto-login
  const user = await login(email, password)
  return user
}

export function logout() {
  setToken(null)
  setStoredUser(null)
}

export function getCurrentUser() {
  return getStoredUser()
}

export async function fetchMe() {
  const data = await request('/auth/me')
  const user = data?.user || data
  setStoredUser(user)
  return user
}

export default { login, register, logout, getCurrentUser, fetchMe }
