import { useState, useCallback } from 'react'
import { fetchServiceDetail, type ServiceDetailResponse } from '../api/resources'

const DEFAULT_REGION = 'ap-south-1'

const SERVICES = [
  { key: 'Amazon Elastic Compute Cloud - Compute', label: 'EC2',             icon: '🖥️',  desc: 'Virtual servers' },
  { key: 'Amazon Relational Database Service',     label: 'RDS',             icon: '🗄️',  desc: 'Managed databases' },
  { key: 'Amazon Simple Storage Service',          label: 'S3',              icon: '🪣',  desc: 'Object storage' },
  { key: 'AWS Lambda',                             label: 'Lambda',          icon: '⚡',  desc: 'Serverless functions' },
  { key: 'Amazon CloudFront',                      label: 'CloudFront',      icon: '🌐',  desc: 'CDN' },
  { key: 'Amazon Elastic Load Balancing',          label: 'Load Balancers',  icon: '⚖️',  desc: 'Traffic distribution' },
  { key: 'Amazon ElastiCache',                     label: 'ElastiCache',     icon: '🔴',  desc: 'In-memory cache' },
  { key: 'Amazon Simple Queue Service',            label: 'SQS',             icon: '📨',  desc: 'Message queues' },
  { key: 'Amazon Simple Notification Service',     label: 'SNS',             icon: '🔔',  desc: 'Pub/sub messaging' },
  { key: 'Amazon Route 53',                        label: 'Route 53',        icon: '🔀',  desc: 'DNS' },
  { key: 'AWS Key Management Service',             label: 'KMS',             icon: '🔑',  desc: 'Key management' },
  { key: 'AWS Secrets Manager',                    label: 'Secrets Manager', icon: '🔒',  desc: 'Secrets storage' },
  { key: 'AWS CodePipeline',                       label: 'CodePipeline',    icon: '🔄',  desc: 'CI/CD pipelines' },
  { key: 'AWS CodeCommit',                         label: 'CodeCommit',      icon: '📦',  desc: 'Git repositories' },
  { key: 'Amazon Kinesis Firehose',                label: 'Firehose',        icon: '🔥',  desc: 'Data streaming' },
  { key: 'AWS WAF',                                label: 'WAF',             icon: '🛡️',  desc: 'Web firewall' },
  { key: 'Amazon API Gateway',                     label: 'API Gateway',     icon: '🚪',  desc: 'API management' },
  { key: 'Amazon Virtual Private Cloud',           label: 'VPC / NAT',       icon: '🏗️',  desc: 'Network' },
  { key: 'Amazon CloudWatch',                      label: 'CloudWatch',      icon: '📊',  desc: 'Monitoring' },
]

interface Props {
  profile: string
}

function StateChip({ value }: { value: string }) {
  const v = value.toLowerCase()
  const cls =
    v === 'running' || v === 'available' || v === 'active' || v === 'enabled' || v === 'ok'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : v === 'stopped' || v === 'inactive' || v === 'disabled'
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : v === 'pending' || v === 'provisioning'
      ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
      : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {value}
    </span>
  )
}

const STATE_COLS = new Set(['state', 'status', 'multi-az'])

export default function ResourcesPage({ profile }: Props) {
  const [selected, setSelected] = useState<typeof SERVICES[0] | null>(null)
  const [detail, setDetail]     = useState<ServiceDetailResponse | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const loadDetail = useCallback(async (svc: typeof SERVICES[0]) => {
    setSelected(svc)
    setDetail(null)
    setError(null)
    setLoading(true)
    try {
      const data = await fetchServiceDetail(svc.key, DEFAULT_REGION, profile || undefined)
      setDetail(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }, [profile])

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-white">AWS Infrastructure</h1>
        <p className="text-xs text-slate-500 mt-0.5">Select a service to explore its resources</p>
      </div>

      {/* Service tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {SERVICES.map((svc) => {
          const isActive = selected?.key === svc.key
          return (
            <button
              key={svc.key}
              onClick={() => loadDetail(svc)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'border-blue-500/60 bg-blue-600/10 ring-1 ring-blue-500/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60'
              }`}
            >
              <div className="text-xl mb-1.5">{svc.icon}</div>
              <div className="text-xs font-semibold text-slate-200 leading-tight">{svc.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{svc.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{selected.icon}</span>
              <div>
                <h2 className="text-sm font-semibold text-white">{selected.label}</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">{selected.key}</p>
              </div>
            </div>
            {detail && (
              <span className="text-xs text-slate-500">
                {detail.count} resource{detail.count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading resources…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="m-5 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && detail && detail.count === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-600">
              <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm">No resources found in this region</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && detail && detail.count > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/40">
                    {detail.columns.map((col) => (
                      <th key={col} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-800/40 ${i % 2 !== 0 ? 'bg-slate-800/20' : ''}`}>
                      {detail.columns.map((col) => {
                        const val = row[col] ?? '—'
                        const isState = STATE_COLS.has(col.toLowerCase())
                        return (
                          <td key={col} className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                            {isState && val !== '—'
                              ? <StateChip value={val} />
                              : val
                            }
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
