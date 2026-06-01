const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'mindcare:auth_token'

let onUnauthorized = null

export function setOnUnauthorized(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
    this.isAuthError = statusCode === 401
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('mindcare:user')
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('mindcare:user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('mindcare:user', JSON.stringify(user))
  } else {
    localStorage.removeItem('mindcare:user')
  }
}

function decodeToken(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  const payload = decodeToken(token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}

export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    useAuth = true,
    formData = false,
  } = options

  const url = `${BASE_URL}${endpoint}`

  const requestHeaders = { ...headers }

  if (useAuth) {
    const token = getToken()
    if (token) {
      if (isTokenExpired(token)) {
        clearAuth()
        if (onUnauthorized) onUnauthorized()
        throw new ApiError(401, 'Sessão expirada. Faça login novamente.')
      }
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  if (!formData) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const config = {
    method,
    headers: requestHeaders,
  }

  if (body !== undefined) {
    config.body = formData ? body : JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(url, config)
  } catch (err) {
    throw new ApiError(0, 'Erro de conexão com o servidor. Verifique sua rede.')
  }

  let data
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    const text = await response.text()
    data = { error: text || response.statusText }
  }

  if (!response.ok) {
    if (response.status === 401 && useAuth) {
      clearAuth()
      if (onUnauthorized) onUnauthorized()
    }
    const message = data?.error || `Erro ${response.status}`
    throw new ApiError(response.status, message, data)
  }

  return data
}

export default {
  request,
  setToken,
  getToken,
  getStoredUser,
  setStoredUser,
  setOnUnauthorized,
  isTokenExpired,
  ApiError,
}
