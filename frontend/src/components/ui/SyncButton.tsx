import { useState } from 'react'
import { triggerSync, fetchSyncStatus } from '../../api/sync'
import type { SyncStatusResponse } from '../../types/billing'

interface Props {
  onSyncComplete: () => void
  cloud: string
  cloudAccount: string
}

export default function SyncButton({ onSyncComplete, cloud, cloudAccount }: Props) {
  const [syncing, setSyncing]   = useState(false)
  const [lastSync, setLastSync] = useState<SyncStatusResponse | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const canSync = !!cloudAccount

  const handleSync = async () => {
    if (!canSync) return
    setSyncing(true)
    setError(null)
    try {
      await triggerSync({ months_back: 12, cloud, cloud_account: cloudAccount })

      const poll = async () => {
        const status = await fetchSyncStatus()
        if (status.status === 'running') {
          setTimeout(poll, 2000)
        } else {
          setLastSync(status)
          setSyncing(false)
          if (status.status === 'success') {
            onSyncComplete()
          } else {
            setError(status.error_message ?? 'Sync failed')
          }
        }
      }
      setTimeout(poll, 1000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sync failed')
      setSyncing(false)
    }
  }

  const cloudLabel = cloud === 'azure' ? 'Azure' : 'AWS'

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={syncing || !canSync}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                   disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        {syncing ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync from {cloudLabel}
          </>
        )}
      </button>
      {lastSync && !syncing && lastSync.status === 'success' && (
        <span className="text-xs text-slate-400">
          Synced {lastSync.months_synced} months · {new Date(lastSync.finished_at!).toLocaleTimeString()}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
