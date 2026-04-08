import client from './client'
import type {
  MonthlyCostListResponse,
  MonthlyCostItem,
  ServiceBreakdownResponse,
  SummaryResponse,
} from '../types/billing'

export async function fetchMonthlyCosts(params?: {
  year?: number
  limit?: number
  cloud?: string
  cloud_account?: string
}): Promise<MonthlyCostListResponse> {
  const { data } = await client.get('/costs/monthly', { params })
  return data
}

export async function fetchMonthlyCost(
  year: number,
  month: number,
  cloud?: string,
  cloud_account?: string,
): Promise<MonthlyCostItem> {
  const { data } = await client.get(`/costs/monthly/${year}/${month}`, {
    params: { cloud, cloud_account },
  })
  return data
}

export async function fetchServiceCosts(
  year: number,
  month: number,
  params?: { sort_by?: 'cost' | 'name'; min_cost?: number; cloud?: string; cloud_account?: string }
): Promise<ServiceBreakdownResponse> {
  const { data } = await client.get(`/costs/services/${year}/${month}`, { params })
  return data
}

export async function fetchSummary(cloud?: string, cloud_account?: string): Promise<SummaryResponse> {
  const { data } = await client.get('/costs/summary', { params: { cloud, cloud_account } })
  return data
}
