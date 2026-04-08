import { useState, useEffect } from 'react'
import { fetchServiceCosts } from '../api/costs'
import type { ServiceBreakdownResponse } from '../types/billing'

export function useServiceCosts(
  year: number | null,
  month: number | null,
  cloud = 'aws',
  cloudAccount = '',
) {
  const [data, setData] = useState<ServiceBreakdownResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!year || !month) {
      setData(null)
      return
    }

    let cancelled = false
    setData(null)
    setIsLoading(true)
    setError(null)

    fetchServiceCosts(year, month, { cloud, cloud_account: cloudAccount })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load service data')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [year, month, cloud, cloudAccount])

  return { data, isLoading, error }
}
