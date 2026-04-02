// import { useState, useCallback } from 'react'
// import { fetchServiceDetail, type ServiceDetailResponse } from '../api/resources'

// const DEFAULT_REGION = 'ap-south-1'

// const SERVICES = [
//   { key: 'Amazon Elastic Compute Cloud - Compute', label: 'EC2',             icon: '🖥️',  desc: 'Virtual servers' },
//   { key: 'Amazon Relational Database Service',     label: 'RDS',             icon: '🗄️',  desc: 'Managed databases' },
//   { key: 'Amazon Simple Storage Service',          label: 'S3',              icon: '🪣',  desc: 'Object storage' },
//   { key: 'AWS Lambda',                             label: 'Lambda',          icon: '⚡',  desc: 'Serverless functions' },
//   { key: 'Amazon CloudFront',                      label: 'CloudFront',      icon: '🌐',  desc: 'CDN' },
//   { key: 'Amazon Elastic Load Balancing',          label: 'Load Balancers',  icon: '⚖️',  desc: 'Traffic distribution' },
//   { key: 'Amazon ElastiCache',                     label: 'ElastiCache',     icon: '🔴',  desc: 'In-memory cache' },
//   { key: 'Amazon Simple Queue Service',            label: 'SQS',             icon: '📨',  desc: 'Message queues' },
//   { key: 'Amazon Simple Notification Service',     label: 'SNS',             icon: '🔔',  desc: 'Pub/sub messaging' },
//   { key: 'Amazon Route 53',                        label: 'Route 53',        icon: '🔀',  desc: 'DNS' },
//   { key: 'AWS Key Management Service',             label: 'KMS',             icon: '🔑',  desc: 'Key management' },
//   { key: 'AWS Secrets Manager',                    label: 'Secrets Manager', icon: '🔒',  desc: 'Secrets storage' },
//   { key: 'AWS CodePipeline',                       label: 'CodePipeline',    icon: '🔄',  desc: 'CI/CD pipelines' },
//   { key: 'AWS CodeCommit',                         label: 'CodeCommit',      icon: '📦',  desc: 'Git repositories' },
//   { key: 'Amazon Kinesis Firehose',                label: 'Firehose',        icon: '🔥',  desc: 'Data streaming' },
//   { key: 'AWS WAF',                                label: 'WAF',             icon: '🛡️',  desc: 'Web firewall' },
//   { key: 'Amazon API Gateway',                     label: 'API Gateway',     icon: '🚪',  desc: 'API management' },
//   { key: 'Amazon Virtual Private Cloud',           label: 'VPC / NAT',       icon: '🏗️',  desc: 'Network' },
//   { key: 'Amazon CloudWatch',                      label: 'CloudWatch',      icon: '📊',  desc: 'Monitoring' },
// ]

// interface Props {
//   profile: string
// }

// function StateChip({ value }: { value: string }) {
//   const v = value.toLowerCase()
//   const cls =
//     v === 'running' || v === 'available' || v === 'active' || v === 'enabled' || v === 'ok'
//       ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
//       : v === 'stopped' || v === 'inactive' || v === 'disabled'
//       ? 'bg-red-500/15 text-red-400 border-red-500/30'
//       : v === 'pending' || v === 'provisioning'
//       ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
//       : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
//   return (
//     <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
//       {value}
//     </span>
//   )
// }

// const STATE_COLS = new Set(['state', 'status', 'multi-az'])

// export default function ResourcesPage({ profile }: Props) {
//   const [selected, setSelected] = useState<typeof SERVICES[0] | null>(null)
//   const [detail, setDetail]     = useState<ServiceDetailResponse | null>(null)
//   const [loading, setLoading]   = useState(false)
//   const [error, setError]       = useState<string | null>(null)

//   const loadDetail = useCallback(async (svc: typeof SERVICES[0]) => {
//     setSelected(svc)
//     setDetail(null)
//     setError(null)
//     setLoading(true)
//     try {
//       const data = await fetchServiceDetail(svc.key, DEFAULT_REGION, profile || undefined)
//       setDetail(data)
//     } catch (e: unknown) {
//       setError(e instanceof Error ? e.message : 'Failed to load resources')
//     } finally {
//       setLoading(false)
//     }
//   }, [profile])

//   return (
//     <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

//       {/* Header */}
//       <div>
//         <h1 className="text-base font-semibold text-white">AWS Infrastructure</h1>
//         <p className="text-xs text-slate-500 mt-0.5">Select a service to explore its resources</p>
//       </div>

//       {/* Service tiles */}
//       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
//         {SERVICES.map((svc) => {
//           const isActive = selected?.key === svc.key
//           return (
//             <button
//               key={svc.key}
//               onClick={() => loadDetail(svc)}
//               className={`rounded-xl border p-3 text-left transition-all ${
//                 isActive
//                   ? 'border-blue-500/60 bg-blue-600/10 ring-1 ring-blue-500/30'
//                   : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60'
//               }`}
//             >
//               <div className="text-xl mb-1.5">{svc.icon}</div>
//               <div className="text-xs font-semibold text-slate-200 leading-tight">{svc.label}</div>
//               <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{svc.desc}</div>
//             </button>
//           )
//         })}
//       </div>

//       {/* Detail panel */}
//       {selected && (
//         <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">

//           {/* Panel header */}
//           <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
//             <div className="flex items-center gap-2.5">
//               <span className="text-lg">{selected.icon}</span>
//               <div>
//                 <h2 className="text-sm font-semibold text-white">{selected.label}</h2>
//                 <p className="text-[10px] text-slate-500 mt-0.5">{selected.key}</p>
//               </div>
//             </div>
//             {detail && (
//               <span className="text-xs text-slate-500">
//                 {detail.count} resource{detail.count !== 1 ? 's' : ''}
//               </span>
//             )}
//           </div>

//           {/* Loading */}
//           {loading && (
//             <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-16">
//               <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//               </svg>
//               Loading resources…
//             </div>
//           )}

//           {/* Error */}
//           {!loading && error && (
//             <div className="m-5 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
//               <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
//               </svg>
//               {error}
//             </div>
//           )}

//           {/* Empty */}
//           {!loading && !error && detail && detail.count === 0 && (
//             <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-600">
//               <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//               </svg>
//               <p className="text-sm">No resources found in this region</p>
//             </div>
//           )}

//           {/* Table */}
//           {!loading && !error && detail && detail.count > 0 && (
//             <div className="overflow-x-auto">
//               <table className="w-full text-xs">
//                 <thead>
//                   <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/40">
//                     {detail.columns.map((col) => (
//                       <th key={col} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{col}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {detail.rows.map((row, i) => (
//                     <tr key={i} className={`border-b border-slate-800/40 ${i % 2 !== 0 ? 'bg-slate-800/20' : ''}`}>
//                       {detail.columns.map((col) => {
//                         const val = row[col] ?? '—'
//                         const isState = STATE_COLS.has(col.toLowerCase())
//                         return (
//                           <td key={col} className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
//                             {isState && val !== '—'
//                               ? <StateChip value={val} />
//                               : val
//                             }
//                           </td>
//                         )
//                       })}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }



import { useState, useCallback } from 'react'
import { fetchServiceDetail, type ServiceDetailResponse } from '../api/resources'

const DEFAULT_REGION = 'ap-south-1'

const SERVICES = [
  { key: 'Amazon Elastic Compute Cloud - Compute', label: 'EC2',             icon: '🖥️',  desc: 'Virtual servers', color: 'from-orange-500 to-red-500' },
  { key: 'Amazon Relational Database Service',     label: 'RDS',             icon: '🗄️',  desc: 'Managed databases', color: 'from-blue-500 to-cyan-500' },
  { key: 'Amazon Simple Storage Service',          label: 'S3',              icon: '🪣',  desc: 'Object storage', color: 'from-green-500 to-emerald-500' },
  { key: 'AWS Lambda',                             label: 'Lambda',          icon: '⚡',  desc: 'Serverless functions', color: 'from-purple-500 to-pink-500' },
  { key: 'Amazon CloudFront',                      label: 'CloudFront',      icon: '🌐',  desc: 'CDN', color: 'from-indigo-500 to-blue-500' },
  { key: 'Amazon Elastic Load Balancing',          label: 'Load Balancers',  icon: '⚖️',  desc: 'Traffic distribution', color: 'from-teal-500 to-cyan-500' },
  { key: 'Amazon ElastiCache',                     label: 'ElastiCache',     icon: '🔴',  desc: 'In-memory cache', color: 'from-red-500 to-orange-500' },
  { key: 'Amazon Simple Queue Service',            label: 'SQS',             icon: '📨',  desc: 'Message queues', color: 'from-yellow-500 to-amber-500' },
  { key: 'Amazon Simple Notification Service',     label: 'SNS',             icon: '🔔',  desc: 'Pub/sub messaging', color: 'from-pink-500 to-rose-500' },
  { key: 'Amazon Route 53',                        label: 'Route 53',        icon: '🔀',  desc: 'DNS', color: 'from-emerald-500 to-green-500' },
  { key: 'AWS Key Management Service',             label: 'KMS',             icon: '🔑',  desc: 'Key management', color: 'from-slate-500 to-gray-500' },
  { key: 'AWS Secrets Manager',                    label: 'Secrets Manager', icon: '🔒',  desc: 'Secrets storage', color: 'from-purple-500 to-indigo-500' },
  { key: 'AWS CodePipeline',                       label: 'CodePipeline',    icon: '🔄',  desc: 'CI/CD pipelines', color: 'from-blue-500 to-purple-500' },
  { key: 'AWS CodeCommit',                         label: 'CodeCommit',      icon: '📦',  desc: 'Git repositories', color: 'from-cyan-500 to-blue-500' },
  { key: 'Amazon Kinesis Firehose',                label: 'Firehose',        icon: '🔥',  desc: 'Data streaming', color: 'from-orange-500 to-red-500' },
  { key: 'AWS WAF',                                label: 'WAF',             icon: '🛡️',  desc: 'Web firewall', color: 'from-indigo-500 to-purple-500' },
  { key: 'Amazon API Gateway',                     label: 'API Gateway',     icon: '🚪',  desc: 'API management', color: 'from-green-500 to-teal-500' },
  { key: 'Amazon Virtual Private Cloud',           label: 'VPC / NAT',       icon: '🏗️',  desc: 'Network', color: 'from-slate-500 to-blue-500' },
  { key: 'Amazon CloudWatch',                      label: 'CloudWatch',      icon: '📊',  desc: 'Monitoring', color: 'from-yellow-500 to-orange-500' },
]

interface Props {
  profile: string
}

function StateChip({ value }: { value: string }) {
  const v = value.toLowerCase()
  const config = {
    running: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', icon: '●' },
    available: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', icon: '●' },
    active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', icon: '●' },
    enabled: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', icon: '●' },
    ok: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', icon: '●' },
    stopped: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', icon: '○' },
    inactive: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', icon: '○' },
    disabled: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', icon: '○' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', icon: '◐' },
    provisioning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', icon: '◐' },
  }
  const style = config[v as keyof typeof config] || { bg: 'bg-slate-700/40', text: 'text-slate-400', border: 'border-slate-600/30', icon: '●' }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      <span className="text-[8px]">{style.icon}</span>
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=Space+Grotesk:wght@300..700&display=swap');

        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes softGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .resources-container {
          margin: 0 auto;
          padding: 32px 28px;
          background: linear-gradient(135deg, #F5FDF8 0%, #F0F9F4 30%, #FEF7E8 70%, #F5FDF8 100%);
          min-height: 100vh;
          position: relative;
        }

        .resources-container::before {
          content: '';
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .service-card {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .service-card::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.04), transparent);
          transition: left 0.5s;
        }

        .service-card:hover::before { left: 100%; }

        .service-card:hover {
          transform: translateY(-4px);
          border-color: rgba(16, 185, 129, 0.4);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.1), 0 2px 4px rgba(0, 0, 0, 0.02);
          background: rgba(255, 255, 255, 0.96);
        }

        .service-card-active {
          background: linear-gradient(135deg, rgba(240, 253, 244, 0.95), rgba(220, 252, 231, 0.88));
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }

        .service-icon {
          font-size: 28px;
          margin-bottom: 8px;
          transition: transform 0.3s ease;
        }

        .service-card:hover .service-icon { transform: scale(1.1); }

        .detail-panel {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          border-radius: 28px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          overflow: hidden;
          animation: fadeInUp 0.5s ease-out;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
        }

        .detail-header {
          background: linear-gradient(135deg, rgba(240, 253, 244, 0.9), rgba(220, 252, 231, 0.7));
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

        .resource-table { width: 100%; border-collapse: collapse; }

        .resource-table th {
          background: linear-gradient(135deg, rgba(240, 253, 244, 0.98), rgba(220, 252, 231, 0.95));
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .resource-table tr { transition: all 0.2s ease; }

        .resource-table tbody tr:hover { background: rgba(16, 185, 129, 0.04); }

        .premium-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .premium-scrollbar::-webkit-scrollbar-track { background: rgba(16, 185, 129, 0.05); border-radius: 10px; }
        .premium-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 10px; }
        .premium-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }

        .loading-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(16, 185, 129, 0.15);
          border-top-color: #10B981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .gradient-text { color: #1F2937; font-weight: 800; }
      `}</style>
      
      <div className="resources-container">
        {/* Header Section */}
        <div className="mb-8 animate-fadeInUp">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 4 4 4h8c2.5 0 4-2 4-4V7c0-2-1.5-4-4-4H8c-2.5 0-4 2-4 4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v5h8V3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">AWS Infrastructure Explorer</h1>
              <p className="text-sm text-gray-500 mt-1">Discover and manage your cloud resources across AWS services</p>
            </div>
          </div>
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
          {SERVICES.map((svc) => {
            const isActive = selected?.key === svc.key
            return (
              <button
                key={svc.key}
                onClick={() => loadDetail(svc)}
                className={`service-card p-4 text-left ${isActive ? 'service-card-active' : ''}`}
              >
                <div className="service-icon">{svc.icon}</div>
                <div className="text-sm font-semibold text-gray-800 mt-2">{svc.label}</div>
                <div className="text-[11px] text-gray-500 mt-1 leading-tight">{svc.desc}</div>
                {isActive && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="detail-panel">
            {/* Panel Header */}
            <div className="detail-header px-6 py-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{selected.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.label}</h2>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{selected.key}</p>
                  </div>
                </div>
                {detail && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-200 rounded-full px-4 py-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm font-semibold text-emerald-700">{detail.count} Resource{detail.count !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <div className="loading-spinner" />
                <p className="text-sm text-gray-500">Loading resources from AWS...</p>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-400">Failed to load resources</p>
                    <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && detail && detail.count === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-700">No resources found</p>
                  <p className="text-sm text-gray-500 mt-1">No {selected.label} resources in {DEFAULT_REGION}</p>
                </div>
              </div>
            )}

            {/* Data Table */}
            {!loading && !error && detail && detail.count > 0 && (
              <div className="overflow-x-auto premium-scrollbar">
                <table className="resource-table">
                  <thead>
                    <tr className="text-[11px] text-emerald-700 uppercase tracking-wider border-b border-emerald-200">
                      {detail.columns.map((col) => (
                        <th key={col} className="px-5 py-4 text-left font-semibold whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{col}</span>
                            {STATE_COLS.has(col.toLowerCase()) && (
                              <span className="text-[8px] text-emerald-500">●</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rows.map((row, i) => (
                      <tr key={i} className={`border-b border-emerald-100 hover:bg-emerald-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50' : ''}`}>
                        {detail.columns.map((col) => {
                          const val = row[col] ?? '—'
                          const isState = STATE_COLS.has(col.toLowerCase())
                          return (
                            <td key={col} className="px-5 py-3 text-gray-700 whitespace-nowrap text-sm">
                              {isState && val !== '—'
                                ? <StateChip value={val} />
                                : val === '—'
                                  ? <span className="text-gray-400">—</span>
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

        {/* Welcome State */}
        {!selected && (
          <div className="detail-panel">
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center animate-pulse">
                <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Explore Your Infrastructure</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Select any AWS service card above to view its resources and configurations in your account
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-200 text-xs text-emerald-700">
                  🖥️ Compute
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-200 text-xs text-emerald-700">
                  🗄️ Database
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-200 text-xs text-emerald-700">
                  🪣 Storage
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}