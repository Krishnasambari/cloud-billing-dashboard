import client from './client'
import type { SyncStatusResponse, CloudAccount } from '../types/billing'

export async function triggerSync(params: {
  months_back: number
  cloud: string
  cloud_account: string
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

export async function fetchAccounts(): Promise<{ accounts: CloudAccount[]; count: number }> {
  const { data } = await client.get('/sync/accounts')
  return data
}

export async function fetchProfiles(): Promise<{ configured: string[]; synced: string[] }> {
  const { data } = await client.get('/sync/profiles')
  return { configured: data.configured ?? [], synced: data.synced ?? [] }
}
