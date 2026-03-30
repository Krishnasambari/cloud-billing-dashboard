import client from './client'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await client.get<AuthUser>('/auth/me')
  return data
}

export async function fetchMyCards(): Promise<Record<string, boolean>> {
  const { data } = await client.get('/auth/me/cards')
  return data
}

const TOKEN_KEY = 'billing_token'
const USER_KEY  = 'billing_user'

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
