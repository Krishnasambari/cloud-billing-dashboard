import { useState, useEffect } from 'react'
import { fetchMonthlyCosts, fetchSummary } from '../api/costs'
import type { MonthlyCostItem, SummaryResponse } from '../types/billing'

export function useMonthlyCosts(cloud = 'aws', cloudAccount = '') {
  const [data, setData] = useState<MonthlyCostItem[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [costsRes, summaryRes] = await Promise.all([
        fetchMonthlyCosts({ limit: 24, cloud, cloud_account: cloudAccount }),
        fetchSummary(cloud, cloudAccount),
      ])
      setData(costsRes.data)
      setSummary(summaryRes)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load cost data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [cloud, cloudAccount])

  return { data, summary, isLoading, error, reload: load }
}
