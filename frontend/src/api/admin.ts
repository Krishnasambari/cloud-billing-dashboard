import client from './client'

export interface UserRecord {
  id: number
  email: string
  name: string
  role: string
  job_role: string
  is_active: boolean
  created_at: string
}

export interface CardItem {
  key: string
  label: string
  group: string
  visible: boolean
}

export interface UserCards {
  user_id: number
  cards: CardItem[]
}

export async function listUsers(): Promise<UserRecord[]> {
  const { data } = await client.get('/admin/users')
  return data
}

export async function createUser(payload: {
  email: string; name: string; password: string; job_role: string
}): Promise<UserRecord> {
  const { data } = await client.post('/admin/users', payload)
  return data
}

export async function updateUser(id: number, payload: {
  name?: string; email?: string; job_role?: string; password?: string; is_active?: boolean
}): Promise<UserRecord> {
  const { data } = await client.patch(`/admin/users/${id}`, payload)
  return data
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/admin/users/${id}`)
}

export async function getUserCards(userId: number): Promise<UserCards> {
  const { data } = await client.get(`/admin/users/${userId}/cards`)
  return data
}

export async function setUserCards(userId: number, cards: Record<string, boolean>): Promise<UserCards> {
  const { data } = await client.put(`/admin/users/${userId}/cards`, { cards })
  return data
}
