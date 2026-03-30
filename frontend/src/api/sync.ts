import client from './client'
import type { SyncStatusResponse } from '../types/billing'

export async function triggerSync(params: {
  months_back: number
  aws_profile: string
}): Promise<SyncStatusResponse> {
  const { data } = await client.post('/sync/trigger', params)
  return data
}

export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const { data } = await client.get('/sync/status')
  return data
}

export async function fetchSyncHistory(limit = 10): Promise<{
  logs: SyncStatusResponse[]
  count: number
}> {
  const { data } = await client.get('/sync/history', { params: { limit } })
  return data
}

export async function fetchProfiles(): Promise<{ configured: string[]; synced: string[] }> {
  // /profiles is on the root app (not sync router) so it always works
  const { data } = await client.get('/profiles')
  return { configured: data.configured ?? [], synced: data.synced ?? [] }
}
