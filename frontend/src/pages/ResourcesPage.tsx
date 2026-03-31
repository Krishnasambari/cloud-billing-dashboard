import { useState, useEffect, useCallback } from 'react'
import { fetchResourceStats, type ResourceStats } from '../api/resources'

const DEFAULT_REGION = 'ap-south-1'

interface Props {
  profile: string
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  )
}

interface CardProps {
  title: string
  icon: string
  loading: boolean
  children: React.ReactNode
}

function ResourceCard({ title, icon, loading, children }: CardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-sky-400">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-slate-800 rounded w-3/4" />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export default function ResourcesPage({ profile }: Props) {
  const region = DEFAULT_REGION
  const [stats, setStats] = useState<ResourceStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (r: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchResourceStats(r, profile || undefined)
      setStats(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { load(region) }, [region, load])

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

      {/* Header row */}
      <div>
        <h1 className="text-base font-semibold text-white">AWS Infrastructure</h1>
        <p className="text-xs text-slate-500 mt-0.5">Live resource counts per region</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          {error}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        <ResourceCard title="EC2 Instances" icon="🖥️" loading={loading}>
          <StatRow label="Total"   value={stats?.EC2.Total   ?? '—'} />
          <StatRow label="Running" value={stats?.EC2.Running ?? '—'} />
          <StatRow label="Stopped" value={stats?.EC2.Stopped ?? '—'} />
        </ResourceCard>

        <ResourceCard title="Elastic IPs" icon="🌐" loading={loading}>
          <StatRow label="Total"        value={stats?.ElasticIP.Total       ?? '—'} />
          <StatRow label="Attached"     value={stats?.ElasticIP.Attached    ?? '—'} />
          <StatRow label="Not Attached" value={stats?.ElasticIP.NotAttached ?? '—'} />
        </ResourceCard>

        <ResourceCard title="EBS Volumes" icon="💾" loading={loading}>
          <StatRow label="Total"     value={stats?.Volumes.Total     ?? '—'} />
          <StatRow label="In Use"    value={stats?.Volumes.InUse     ?? '—'} />
          <StatRow label="Available" value={stats?.Volumes.Available ?? '—'} />
        </ResourceCard>

        <ResourceCard title="Snapshots" icon="📸" loading={loading}>
          <StatRow label="Total" value={stats?.Snapshots.Total ?? '—'} />
        </ResourceCard>

        <ResourceCard title="AMIs" icon="🗂️" loading={loading}>
          <StatRow label="Total" value={stats?.AMIs.Total ?? '—'} />
        </ResourceCard>

        <ResourceCard title="S3 Buckets" icon="🪣" loading={loading}>
          <StatRow label="Total" value={stats?.S3.TotalBuckets ?? '—'} />
        </ResourceCard>

        <ResourceCard title="Load Balancers" icon="⚖️" loading={loading}>
          <StatRow label="Total" value={stats?.LoadBalancers.Total ?? '—'} />
        </ResourceCard>

      </div>
    </div>
  )
}
