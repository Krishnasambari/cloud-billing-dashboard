import { useState, useEffect } from 'react'

const FALLBACK_RATE = 84.5 // fallback if API is unreachable
const CACHE_KEY = 'inr_rate'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { value, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL_MS) return value
      }
    } catch {}
    return FALLBACK_RATE
  })

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL_MS) return
      } catch {}
    }

    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((data) => {
        const inrRate = data?.rates?.INR
        if (typeof inrRate === 'number' && inrRate > 0) {
          setRate(inrRate)
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ value: inrRate, ts: Date.now() })
          )
        }
      })
      .catch(() => {}) // silently use fallback
  }, [])

  return rate
}
