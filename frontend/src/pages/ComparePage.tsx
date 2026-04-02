// import { useState, useEffect, useCallback } from 'react'
// import { fetchMonthlyCosts, fetchServiceCosts } from '../api/costs'
// import { fetchNotes, fetchNotesByRange, upsertNote, deleteNote } from '../api/notes'
// import { fetchResources } from '../api/resources'
// import type { ResourceItem } from '../api/resources'
// import type { MonthlyCostItem, ServiceCostItem, NoteItem } from '../types/billing'

// const fmtDate = (iso: string) =>
//   iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'


// function printSummaryPDF(notes: NoteItem[], from: string, to: string) {
//   const win = window.open('', '_blank')
//   if (!win) return
//   const rows = notes.map((n, i) => `
//     <tr style="background:${i % 2 !== 0 ? '#f8fafc' : '#ffffff'}">
//       <td style="padding:8px 12px;white-space:nowrap;color:#475569">${fmtDate(n.note_date)}</td>
//       <td style="padding:8px 12px;font-weight:500;color:#1e293b">${n.service_name}</td>
//       <td style="padding:8px 12px;color:#3b82f6">${n.resource_name || '—'}</td>
//       <td style="padding:8px 12px;color:#334155;line-height:1.5">${n.note}</td>
//     </tr>`).join('')
//   const fromLabel = fmtDate(from)
//   const toLabel = fmtDate(to)
//   win.document.write(`<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="UTF-8" />
//   <title>Billing Summary — ${fromLabel} to ${toLabel}</title>
//   <style>
//     * { box-sizing: border-box; margin: 0; padding: 0; }
//     body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 32px; }
//     h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
//     .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
//     table { width: 100%; border-collapse: collapse; font-size: 13px; }
//     thead tr { background: #f1f5f9; }
//     th { padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
//     td { border-bottom: 1px solid #e2e8f0; }
//     tr:last-child td { border-bottom: none; }
//     .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: right; }
//     @media print {
//       body { padding: 16px; }
//       button { display: none; }
//     }
//   </style>
// </head>
// <body>
//   <h1>Summary of the billing difference</h1>
//   <p class="meta">Period: ${fromLabel} &mdash; ${toLabel} &nbsp;&bull;&nbsp; ${notes.length} record${notes.length !== 1 ? 's' : ''}</p>
//   <table>
//     <thead>
//       <tr>
//         <th style="width:120px">Date</th>
//         <th>Service</th>
//         <th style="width:180px">Resource</th>
//         <th>Reason / Note</th>
//       </tr>
//     </thead>
//     <tbody>${rows}</tbody>
//   </table>
//   <p class="footer">Generated ${new Date().toLocaleString()}</p>
//   <script>window.onload = function() { window.print() }<\/script>
// </body>
// </html>`)
//   win.document.close()
// }

// interface Props {
//   cards: Record<string, boolean>
//   profile: string
// }

// const fmt = new Intl.NumberFormat('en-US', {
//   style: 'currency',
//   currency: 'USD',
//   minimumFractionDigits: 2,
// })

// const fmtDiff = (v: number) => (v > 0 ? '+' : '') + fmt.format(v)

// interface CompareRow {
//   service_name: string
//   cost_a: number
//   cost_b: number
//   diff: number
// }

// function MonthSelect({
//   label,
//   months,
//   value,
//   onChange,
//   exclude,
// }: {
//   label: string
//   months: MonthlyCostItem[]
//   value: string
//   onChange: (v: string) => void
//   exclude: string
// }) {
//   return (
//     <div className="flex flex-col gap-1.5">
//       <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
//       >
//         <option value="">— Select month —</option>
//         {months.map((m) => {
//           const key = `${m.year}-${m.month}`
//           return (
//             <option key={key} value={key} disabled={key === exclude}>
//               {m.label}
//             </option>
//           )
//         })}
//       </select>
//     </div>
//   )
// }

// export default function ComparePage({ cards, profile }: Props) {
//   const canAddReason = cards['feature_add_reason'] !== false
//   const [months, setMonths] = useState<MonthlyCostItem[]>([])
//   const [monthsLoading, setMonthsLoading] = useState(true)
//   const [selA, setSelA] = useState('')
//   const [selB, setSelB] = useState('')

//   const [rows, setRows] = useState<CompareRow[]>([])
//   const [comparing, setComparing] = useState(false)
//   const [compareError, setCompareError] = useState<string | null>(null)

//   // Notes keyed by service_name
//   const [notes, setNotes] = useState<Map<string, NoteItem>>(new Map())
//   const [notesLoading, setNotesLoading] = useState(false)

//   // Form state
//   const [formService, setFormService] = useState('')
//   const [formNote, setFormNote] = useState('')
//   const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
//   const [formPriceFilter, setFormPriceFilter] = useState<'price_up' | 'price_down' | ''>('')
//   const [formSaving, setFormSaving] = useState(false)
//   const [formError, setFormError] = useState<string | null>(null)
//   const [formSuccess, setFormSuccess] = useState(false)

//   // Resource state
//   const [resources, setResources] = useState<ResourceItem[]>([])
//   const [resourcesLoading, setResourcesLoading] = useState(false)
//   const [resourcesSupported, setResourcesSupported] = useState(false)
//   const [formResourceId, setFormResourceId] = useState('')
//   const [formResourceName, setFormResourceName] = useState('')
//   const [resourceSearch, setResourceSearch] = useState('')

//   // Load months for dropdowns
//   useEffect(() => {
//     setMonths([])
//     setMonthsLoading(true)
//     fetchMonthlyCosts({ limit: 24, profile })
//       .then((res) => setMonths(res.data))
//       .catch(() => setMonths([]))
//       .finally(() => setMonthsLoading(false))
//   }, [profile])

//   // Run comparison when both months selected
//   useEffect(() => {
//     if (!selA || !selB) { setRows([]); return }
//     const [yearA, monthA] = selA.split('-').map(Number)
//     const [yearB, monthB] = selB.split('-').map(Number)

//     setComparing(true)
//     setCompareError(null)
//     setRows([])

//     Promise.all([
//       fetchServiceCosts(yearA, monthA, { min_cost: 0, profile }),
//       fetchServiceCosts(yearB, monthB, { min_cost: 0, profile }),
//     ])
//       .then(([resA, resB]) => {
//         const mapA = new Map<string, ServiceCostItem>(resA.services.map((s) => [s.service_name, s]))
//         const mapB = new Map<string, ServiceCostItem>(resB.services.map((s) => [s.service_name, s]))
//         const allServices = new Set([...mapA.keys(), ...mapB.keys()])
//         const result: CompareRow[] = []
//         allServices.forEach((name) => {
//           const costA = mapA.get(name)?.cost ?? 0
//           const costB = mapB.get(name)?.cost ?? 0
//           result.push({ service_name: name, cost_a: costA, cost_b: costB, diff: costB - costA })
//         })
//         result.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
//         setRows(result)
//       })
//       .catch((e: unknown) => setCompareError(e instanceof Error ? e.message : 'Failed to load data'))
//       .finally(() => setComparing(false))
//   }, [selA, selB])

//   // Load notes for Month B whenever it changes
//   useEffect(() => {
//     if (!selB) { setNotes(new Map()); return }
//     const [yearB, monthB] = selB.split('-').map(Number)
//     setNotesLoading(true)
//     fetchNotes(yearB, monthB, profile)
//       .then((items) => {
//         const m = new Map<string, NoteItem>()
//         items.forEach((n) => m.set(n.service_name, n))
//         setNotes(m)
//       })
//       .catch(() => setNotes(new Map()))
//       .finally(() => setNotesLoading(false))
//   }, [selB])

//   // Reset form when Month B changes
//   useEffect(() => {
//     setFormService('')
//     setFormNote('')
//     setFormPriceFilter('')
//     setFormError(null)
//     setResources([])
//     setFormResourceId('')
//     setFormResourceName('')
//     setResourceSearch('')
//   }, [selB])

//   // Fetch resources when service changes
//   useEffect(() => {
//     setResources([])
//     setFormResourceId('')
//     setFormResourceName('')
//     setResourceSearch('')
//     setResourcesSupported(false)
//     if (!formService) return

//     setResourcesLoading(true)
//     fetchResources(formService, profile)
//       .then((res) => {
//         setResources(res.resources)
//         setResourcesSupported(res.supported)
//         // Pre-fill resource if existing note has one
//         const existing = notes.get(formService)
//         if (existing?.resource_id) {
//           setFormResourceId(existing.resource_id)
//           setFormResourceName(existing.resource_name ?? '')
//         }
//       })
//       .catch(() => setResources([]))
//       .finally(() => setResourcesLoading(false))
//   }, [formService])

//   // Click a row → select service, leave note empty
//   const handleRowClick = (serviceName: string) => {
//     setFormService(serviceName)
//     setFormNote('')
//     setFormPriceFilter('')
//     setFormError(null)
//     setFormSuccess(false)
//   }

//   const handleSave = async () => {
//     if (!selB || !formService || !formNote.trim()) return
//     const [yearB, monthB] = selB.split('-').map(Number)
//     setFormSaving(true)
//     setFormError(null)
//     setFormSuccess(false)
//     try {
//       const saved = await upsertNote({
//         year: yearB, month: monthB,
//         service_name: formService,
//         note: formNote.trim(),
//         note_date: formDate,
//         resource_id: formResourceId || null,
//         resource_name: formResourceName || null,
//         filter_name: formPriceFilter || null,
//         aws_profile: profile || 'default',
//       })
//       setNotes((prev) => new Map(prev).set(saved.service_name, saved))
//       setFormSuccess(true)
//       refreshSummary()
//     } catch (e: unknown) {
//       setFormError(e instanceof Error ? e.message : 'Failed to save')
//     } finally {
//       setFormSaving(false)
//     }
//   }

//   const handleDeleteNote = async (serviceName: string) => {
//     const existing = notes.get(serviceName)
//     if (!existing) return
//     try {
//       await deleteNote(existing.id)
//       setNotes((prev) => { const m = new Map(prev); m.delete(serviceName); return m })
//       if (formService === serviceName) setFormNote('')
//       refreshSummary()
//     } catch {}
//   }

//   const [diffFilter, setDiffFilter] = useState<'all' | 'increase' | 'decrease'>('all')

//   // ── Summary section (independent of comparison) ───────────────────────────
//   const today = new Date()
//   const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
//   const defaultTo   = today.toISOString().slice(0, 10)
//   const [summaryFrom, setSummaryFrom]   = useState(defaultFrom)
//   const [summaryTo, setSummaryTo]       = useState(defaultTo)
//   const [summaryNotes, setSummaryNotes] = useState<NoteItem[]>([])
//   const [summaryLoading, setSummaryLoading] = useState(true)

//   const loadSummary = useCallback((from: string, to: string) => {
//     setSummaryLoading(true)
//     fetchNotesByRange(from, to, profile)
//       .then(setSummaryNotes)
//       .catch(() => setSummaryNotes([]))
//       .finally(() => setSummaryLoading(false))
//   }, [profile])

//   useEffect(() => { loadSummary(summaryFrom, summaryTo) }, [profile])

//   // Reload summary whenever a note is saved or deleted
//   const refreshSummary = () => loadSummary(summaryFrom, summaryTo)

//   const labelA = months.find((m) => `${m.year}-${m.month}` === selA)?.label ?? ''
//   const labelB = months.find((m) => `${m.year}-${m.month}` === selB)?.label ?? ''

//   const filteredRows = rows.filter((r) => {
//     if (diffFilter === 'increase') return r.diff > 0
//     if (diffFilter === 'decrease') return r.diff < 0
//     return true
//   })

//   const totalA = rows.reduce((s, r) => s + r.cost_a, 0)
//   const totalB = rows.reduce((s, r) => s + r.cost_b, 0)
//   const totalDiff = totalB - totalA

//   const hasResults = rows.length > 0 && !comparing

//   return (
//     <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

//       {/* Filter row */}
//       <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-5">
//         <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Select months to compare</p>
//         {monthsLoading ? (
//           <p className="text-sm text-slate-500">Loading...</p>
//         ) : months.length === 0 ? (
//           <p className="text-sm text-slate-500">No data — run a sync first.</p>
//         ) : (
//           <div className="flex flex-wrap items-end gap-4">
//             <MonthSelect label="Month A · Baseline" months={months} value={selA} onChange={setSelA} exclude={selB} />
//             <span className="text-slate-600 text-sm pb-2">vs</span>
//             <MonthSelect label="Month B · Comparison" months={months} value={selB} onChange={setSelB} exclude={selA} />
//             {(selA || selB) && (
//               <button onClick={() => { setSelA(''); setSelB('') }} className="text-xs text-slate-500 hover:text-white pb-2">
//                 ✕ Clear
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Results + Note form side-by-side */}
//       {(comparing || compareError || hasResults) && (
//         <div className="flex gap-5 items-start">

//           {/* Compare table — left, takes most space */}
//           <div className="flex-1 min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
//             <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
//               <div>
//                 <h2 className="text-sm font-semibold text-white">
//                   {labelA} <span className="text-slate-600 font-normal">vs</span> {labelB}
//                 </h2>
//                 <p className="text-[10px] text-slate-500 mt-0.5">
//                   {filteredRows.length} of {rows.length} services · click a row to add a reason
//                 </p>
//               </div>
//               {hasResults && (
//                 <div className="text-right">
//                   <p className="text-[10px] text-slate-500">Total diff</p>
//                   <p className={`text-base font-bold ${totalDiff > 0 ? 'text-red-400' : totalDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
//                     {fmtDiff(totalDiff)}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Diff filter pills */}
//             {hasResults && (
//               <div className="px-5 py-2.5 border-b border-slate-800/60 flex items-center gap-2">
//                 <span className="text-[10px] text-slate-600 uppercase tracking-wider mr-1">Filter</span>
//                 {([
//                   { key: 'all', label: 'All', cls: 'text-slate-400 border-slate-700 hover:border-slate-500' },
//                   { key: 'increase', label: '▲ Price Increase', cls: 'text-red-400 border-red-500/30 hover:border-red-400/50' },
//                   { key: 'decrease', label: '▼ Price Decrease', cls: 'text-emerald-400 border-emerald-500/30 hover:border-emerald-400/50' },
//                 ] as { key: 'all'|'increase'|'decrease'; label: string; cls: string }[]).map(({ key, label, cls }) => (
//                   <button
//                     key={key}
//                     onClick={() => setDiffFilter(key)}
//                     className={`px-3 py-1 rounded-full text-xs border transition-colors font-medium ${cls} ${diffFilter === key ? 'bg-slate-800' : 'bg-transparent'}`}
//                   >
//                     {label}
//                     {key === 'increase' && <span className="ml-1 opacity-50">({rows.filter(r => r.diff > 0).length})</span>}
//                     {key === 'decrease' && <span className="ml-1 opacity-50">({rows.filter(r => r.diff < 0).length})</span>}
//                   </button>
//                 ))}
//               </div>
//             )}

//             {comparing ? (
//               <div className="h-32 flex items-center justify-center text-slate-600 text-xs gap-2">
//                 <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//                 </svg>
//                 Comparing...
//               </div>
//             ) : compareError ? (
//               <p className="p-5 text-sm text-red-400">{compareError}</p>
//             ) : (
//               <div className="overflow-auto">
//                 <table className="w-full table-fixed text-xs">
//                   <colgroup>
//                     <col style={{ width: '46%' }} />
//                     <col style={{ width: '18%' }} />
//                     <col style={{ width: '18%' }} />
//                     <col style={{ width: '18%' }} />
//                   </colgroup>
//                   <thead>
//                     <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
//                       <th className="px-4 py-2 text-left font-semibold">Service</th>
//                       <th className="py-2 text-right font-semibold">{labelA}</th>
//                       <th className="py-2 text-right font-semibold">{labelB}</th>
//                       <th className="py-2 text-right font-semibold">Diff</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filteredRows.map((row) => {
//                       const isSelected = formService === row.service_name
//                       const existingNote = notes.get(row.service_name)
//                       return (
//                         <tr
//                           key={row.service_name}
//                           onClick={() => handleRowClick(row.service_name)}
//                           className={`border-b border-slate-800/40 cursor-pointer transition-colors ${
//                             isSelected
//                               ? 'bg-blue-600/10 border-blue-500/20'
//                               : 'hover:bg-slate-800/40'
//                           }`}
//                         >
//                           <td className="px-4 py-1.5 truncate text-slate-300">{row.service_name}</td>
//                           <td className="py-1.5 text-right font-mono text-slate-400">
//                             {row.cost_a > 0 ? fmt.format(row.cost_a) : <span className="text-slate-700">—</span>}
//                           </td>
//                           <td className="py-1.5 text-right font-mono text-slate-400">
//                             {row.cost_b > 0 ? fmt.format(row.cost_b) : <span className="text-slate-700">—</span>}
//                           </td>
//                           <td className={`py-1.5 text-right font-mono font-semibold ${
//                             row.diff > 0 ? 'text-red-400' : row.diff < 0 ? 'text-emerald-400' : 'text-slate-600'
//                           }`}>
//                             {row.diff === 0 ? '—' : fmtDiff(row.diff)}
//                           </td>
//                         </tr>
//                       )
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr className="border-t-2 border-slate-700 font-semibold text-white">
//                       <td className="px-4 py-2">Total</td>
//                       <td className="py-2 text-right font-mono">{fmt.format(totalA)}</td>
//                       <td className="py-2 text-right font-mono">{fmt.format(totalB)}</td>
//                       <td className={`py-2 text-right font-mono ${totalDiff > 0 ? 'text-red-400' : totalDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
//                         {fmtDiff(totalDiff)}
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             )}
//           </div>

//           {/* Note form — right panel, fixed width */}
//           {canAddReason && hasResults && selB && (
//             <div className="w-72 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
//               <div className="px-5 py-4 border-b border-slate-800/60">
//                 <h3 className="text-sm font-semibold text-white">Add Reason</h3>
//                 <p className="text-[10px] text-slate-500 mt-0.5">For {labelB}</p>
//               </div>

//               <div className="p-5 space-y-4">
//                 {/* Date */}
//                 <div className="flex flex-col gap-1.5">
//                   <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date</label>
//                   <input
//                     type="date"
//                     value={formDate}
//                     onChange={(e) => setFormDate(e.target.value)}
//                     className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 {/* Service */}
//                 <div className="flex flex-col gap-1.5">
//                   <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Service</label>
//                   <select
//                     value={formService}
//                     onChange={(e) => {
//                       setFormService(e.target.value)
//                       setFormNote('')
//                       setFormPriceFilter('')
//                       setFormSuccess(false)
//                     }}
//                     className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   >
//                     <option value="">— Select service —</option>
//                     {rows.map((r) => (
//                       <option key={r.service_name} value={r.service_name}>
//                         {r.service_name}
//                       </option>
//                     ))}
//                   </select>
//                   {formService && notes.has(formService) && (
//                     <p className="text-[10px] text-blue-400">Editing existing reason</p>
//                   )}
//                 </div>

//                 {/* Resource selector — shown when service is selected */}
//                 {formService && (
//                   <div className="flex flex-col gap-1.5">
//                     <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                       Resource
//                       {resourcesLoading && (
//                         <svg className="animate-spin w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none">
//                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//                         </svg>
//                       )}
//                     </label>

//                     {resourcesLoading ? (
//                       <p className="text-[10px] text-slate-600">Loading resources...</p>
//                     ) : !resourcesSupported && resources.length === 0 ? (
//                       <p className="text-[10px] text-slate-600 italic">Not supported for this service</p>
//                     ) : resources.length === 0 ? (
//                       <p className="text-[10px] text-slate-600 italic">No resources found</p>
//                     ) : (
//                       <div className="space-y-1.5">
//                         {/* Search */}
//                         <input
//                           type="text"
//                           placeholder="Search resources..."
//                           value={resourceSearch}
//                           onChange={(e) => setResourceSearch(e.target.value)}
//                           className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         />
//                         {/* Native select — always works */}
//                         <select
//                           size={5}
//                           value={formResourceId}
//                           onChange={(e) => {
//                             const id = e.target.value
//                             const found = resources.find((r) => r.id === id)
//                             setFormResourceId(id)
//                             setFormResourceName(found?.name ?? id)
//                           }}
//                           className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-auto"
//                         >
//                           <option value="">— No specific resource —</option>
//                           {resources
//                             .filter((r) =>
//                               !resourceSearch ||
//                               r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
//                               r.id.toLowerCase().includes(resourceSearch.toLowerCase())
//                             )
//                             .map((r) => (
//                               <option key={r.id} value={r.id} title={r.detail}>
//                                 {r.name}{r.detail ? ` · ${r.detail}` : ''}
//                               </option>
//                             ))}
//                         </select>

//                         {/* Selected confirmation */}
//                         {formResourceId && (
//                           <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
//                             <span className="text-[10px] text-blue-400 truncate">{formResourceName || formResourceId}</span>
//                             <button
//                               type="button"
//                               onClick={() => { setFormResourceId(''); setFormResourceName('') }}
//                               className="text-slate-500 hover:text-red-400 ml-2 shrink-0 text-xs"
//                             >
//                               ✕
//                             </button>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {/* Price */}
//                 <div className="flex flex-col gap-1.5">
//                   <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Price</label>
//                   <div className="relative">
//                     <select
//                       value={formPriceFilter}
//                       onChange={(e) => setFormPriceFilter(e.target.value as 'price_up' | 'price_down' | '')}
//                       className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg pl-3 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
//                     >
//                       <option value="">— Select —</option>
//                       <option value="price_up">▲ Price Up</option>
//                       <option value="price_down">▼ Price Down</option>
//                     </select>
//                     <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
//                     </svg>
//                   </div>
//                 </div>

//                 {/* Reason */}
//                 <div className="flex flex-col gap-1.5">
//                   <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reason / Note</label>
//                   <textarea
//                     value={formNote}
//                     onChange={(e) => { setFormNote(e.target.value); setFormSuccess(false) }}
//                     rows={4}
//                     placeholder="e.g. EC2 scale-out for load test in March"
//                     className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
//                   />
//                 </div>

//                 {/* Selected diff preview */}
//                 {formService && (() => {
//                   const row = rows.find(r => r.service_name === formService)
//                   if (!row || row.diff === 0) return null
//                   return (
//                     <div className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between ${
//                       row.diff > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
//                     }`}>
//                       <span className="text-slate-400 truncate pr-2">{row.service_name.replace(/^Amazon\s+|^AWS\s+/, '')}</span>
//                       <span className={`font-mono font-bold shrink-0 ${row.diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
//                         {fmtDiff(row.diff)}
//                       </span>
//                     </div>
//                   )
//                 })()}

//                 {/* Save */}
//                 <button
//                   onClick={handleSave}
//                   disabled={formSaving || !formService || !formNote.trim()}
//                   className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors"
//                 >
//                   {formSaving ? 'Saving...' : 'Save Reason'}
//                 </button>

//                 {formSuccess && (
//                   <p className="text-xs text-emerald-400 text-center">✓ Saved</p>
//                 )}
//                 {formError && (
//                   <p className="text-xs text-red-400">{formError}</p>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Empty state */}
//       {!comparing && !compareError && rows.length === 0 && selA && selB && (
//         <p className="text-center text-slate-600 text-sm py-10">No service data for selected months.</p>
//       )}

//       {/* ── Summary of billing difference ─────────────────────────────────── */}
//       <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">

//         {/* Header */}
//         <div className="px-6 py-4 border-b border-slate-800/60 flex flex-wrap items-center gap-4 justify-between">
//           <div>
//             <h2 className="text-sm font-semibold text-white">Summary of the billing difference</h2>
//             <p className="text-xs text-slate-500 mt-0.5">
//               {summaryLoading ? 'Loading…' : `${summaryNotes.length} reason${summaryNotes.length !== 1 ? 's' : ''}`}
//             </p>
//           </div>

//           {/* Date range + Download */}
//           <div className="flex flex-wrap items-center gap-2">
//             <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//             </svg>
//             <input
//               type="date"
//               value={summaryFrom}
//               onChange={(e) => {
//                 setSummaryFrom(e.target.value)
//                 loadSummary(e.target.value, summaryTo)
//               }}
//               className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5
//                          focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//             <span className="text-slate-600 text-xs">to</span>
//             <input
//               type="date"
//               value={summaryTo}
//               onChange={(e) => {
//                 setSummaryTo(e.target.value)
//                 loadSummary(summaryFrom, e.target.value)
//               }}
//               className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5
//                          focus:outline-none focus:ring-1 focus:ring-blue-500"
//             />
//             <button
//               onClick={() => {
//                 setSummaryFrom(defaultFrom)
//                 setSummaryTo(defaultTo)
//                 loadSummary(defaultFrom, defaultTo)
//               }}
//               className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
//               title="Reset to current month"
//             >
//               Reset
//             </button>

//             {/* PDF Download */}
//             <button
//               onClick={() => printSummaryPDF(summaryNotes, summaryFrom, summaryTo)}
//               disabled={summaryNotes.length === 0}
//               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
//                          disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
//             >
//               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//               </svg>
//               Download PDF
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         {summaryLoading ? (
//           <div className="flex items-center justify-center gap-2 text-slate-600 text-xs py-10">
//             <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
//               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
//             </svg>
//             Loading summary…
//           </div>
//         ) : summaryNotes.length === 0 ? (
//           <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-600">
//             <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//             </svg>
//             <p className="text-sm">No reasons recorded for this period</p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-xs">
//               <thead>
//                 <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/40">
//                   <th className="px-5 py-3 text-left font-semibold w-32">Date</th>
//                   <th className="px-4 py-3 text-left font-semibold">Service</th>
//                   <th className="px-4 py-3 text-left font-semibold w-44">Resource</th>
//                   <th className="px-4 py-3 text-left font-semibold">Reason / Note</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {summaryNotes.map((note, i) => (
//                   <tr key={note.id} className={`border-b border-slate-800/40 ${i % 2 !== 0 ? 'bg-slate-800/20' : ''}`}>
//                     <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{fmtDate(note.note_date)}</td>
//                     <td className="px-4 py-3 text-slate-200 font-medium">{note.service_name}</td>
//                     <td className="px-4 py-3">
//                       {note.resource_name
//                         ? <span className="text-blue-400" title={note.resource_id ?? ''}>{note.resource_name}</span>
//                         : <span className="text-slate-600 italic">—</span>}
//                     </td>
//                     <td className="px-4 py-3 text-slate-300 leading-relaxed">{note.note}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }




import { useState, useEffect, useCallback } from 'react'
import { fetchMonthlyCosts, fetchServiceCosts } from '../api/costs'
import { fetchNotes, fetchNotesByRange, upsertNote, deleteNote } from '../api/notes'
import { fetchResources } from '../api/resources'
import type { ResourceItem } from '../api/resources'
import type { MonthlyCostItem, ServiceCostItem, NoteItem } from '../types/billing'

const fmtDate = (iso: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function printSummaryPDF(notes: NoteItem[], from: string, to: string) {
  const win = window.open('', '_blank')
  if (!win) return
  const rows = notes.map((n, i) => `
    <tr style="background:${i % 2 !== 0 ? '#f8fafc' : '#ffffff'}">
      <td style="padding:8px 12px;white-space:nowrap;color:#475569">${fmtDate(n.note_date)}</td>
      <td style="padding:8px 12px;font-weight:500;color:#1e293b">${n.service_name}</td>
      <td style="padding:8px 12px;color:#3b82f6">${n.resource_name || '—'}</td>
      <td style="padding:8px 12px;color:#334155;line-height:1.5">${n.note}</td>
    </tr>`).join('')
  const fromLabel = fmtDate(from)
  const toLabel = fmtDate(to)
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Billing Summary — ${fromLabel} to ${toLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1e293b; padding: 32px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; background: linear-gradient(135deg, #1e293b, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); }
    th { padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: right; }
    @media print {
      body { padding: 16px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>📊 Summary of the billing difference</h1>
  <p class="meta">Period: ${fromLabel} — ${toLabel} &nbsp;•&nbsp; ${notes.length} record${notes.length !== 1 ? 's' : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width:120px">Date</th>
        <th>Service</th>
        <th style="width:180px">Resource</th>
        <th>Reason / Note</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">Generated ${new Date().toLocaleString()}</p>
  <script>window.onload = function() { window.print() }<\/script>
</body>
</html>`)
  win.document.close()
}

interface Props {
  cards: Record<string, boolean>
  profile: string
}

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const fmtDiff = (v: number) => (v > 0 ? '+' : '') + fmt.format(v)

interface CompareRow {
  service_name: string
  cost_a: number
  cost_b: number
  diff: number
}

function MonthSelect({
  label,
  months,
  value,
  onChange,
  exclude,
}: {
  label: string
  months: MonthlyCostItem[]
  value: string
  onChange: (v: string) => void
  exclude: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-emerald-200 text-gray-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[180px] transition-all hover:border-emerald-300"
      >
        <option value="">— Select month —</option>
        {months.map((m) => {
          const key = `${m.year}-${m.month}`
          return (
            <option key={key} value={key} disabled={key === exclude}>
              {m.label}
            </option>
          )
        })}
      </select>
    </div>
  )
}

export default function ComparePage({ cards, profile }: Props) {
  const canAddReason = cards['feature_add_reason'] !== false
  const [months, setMonths] = useState<MonthlyCostItem[]>([])
  const [monthsLoading, setMonthsLoading] = useState(true)
  const [selA, setSelA] = useState('')
  const [selB, setSelB] = useState('')

  const [rows, setRows] = useState<CompareRow[]>([])
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)

  const [notes, setNotes] = useState<Map<string, NoteItem>>(new Map())
  const [notesLoading, setNotesLoading] = useState(false)

  const [formService, setFormService] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formPriceFilter, setFormPriceFilter] = useState<'price_up' | 'price_down' | ''>('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const [resources, setResources] = useState<ResourceItem[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesSupported, setResourcesSupported] = useState(false)
  const [formResourceId, setFormResourceId] = useState('')
  const [formResourceName, setFormResourceName] = useState('')
  const [resourceSearch, setResourceSearch] = useState('')

  useEffect(() => {
    setMonths([])
    setMonthsLoading(true)
    fetchMonthlyCosts({ limit: 24, profile })
      .then((res) => setMonths(res.data))
      .catch(() => setMonths([]))
      .finally(() => setMonthsLoading(false))
  }, [profile])

  useEffect(() => {
    if (!selA || !selB) { setRows([]); return }
    const [yearA, monthA] = selA.split('-').map(Number)
    const [yearB, monthB] = selB.split('-').map(Number)

    setComparing(true)
    setCompareError(null)
    setRows([])

    Promise.all([
      fetchServiceCosts(yearA, monthA, { min_cost: 0, profile }),
      fetchServiceCosts(yearB, monthB, { min_cost: 0, profile }),
    ])
      .then(([resA, resB]) => {
        const mapA = new Map<string, ServiceCostItem>(resA.services.map((s) => [s.service_name, s]))
        const mapB = new Map<string, ServiceCostItem>(resB.services.map((s) => [s.service_name, s]))
        const allServices = new Set([...mapA.keys(), ...mapB.keys()])
        const result: CompareRow[] = []
        allServices.forEach((name) => {
          const costA = mapA.get(name)?.cost ?? 0
          const costB = mapB.get(name)?.cost ?? 0
          result.push({ service_name: name, cost_a: costA, cost_b: costB, diff: costB - costA })
        })
        result.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        setRows(result)
      })
      .catch((e: unknown) => setCompareError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setComparing(false))
  }, [selA, selB])

  useEffect(() => {
    if (!selB) { setNotes(new Map()); return }
    const [yearB, monthB] = selB.split('-').map(Number)
    setNotesLoading(true)
    fetchNotes(yearB, monthB, profile)
      .then((items) => {
        const m = new Map<string, NoteItem>()
        items.forEach((n) => m.set(n.service_name, n))
        setNotes(m)
      })
      .catch(() => setNotes(new Map()))
      .finally(() => setNotesLoading(false))
  }, [selB])

  useEffect(() => {
    setFormService('')
    setFormNote('')
    setFormPriceFilter('')
    setFormError(null)
    setResources([])
    setFormResourceId('')
    setFormResourceName('')
    setResourceSearch('')
  }, [selB])

  useEffect(() => {
    setResources([])
    setFormResourceId('')
    setFormResourceName('')
    setResourceSearch('')
    setResourcesSupported(false)
    if (!formService) return

    setResourcesLoading(true)
    fetchResources(formService, profile)
      .then((res) => {
        setResources(res.resources)
        setResourcesSupported(res.supported)
        const existing = notes.get(formService)
        if (existing?.resource_id) {
          setFormResourceId(existing.resource_id)
          setFormResourceName(existing.resource_name ?? '')
        }
      })
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false))
  }, [formService])

  const handleRowClick = (serviceName: string) => {
    setFormService(serviceName)
    setFormNote('')
    setFormPriceFilter('')
    setFormError(null)
    setFormSuccess(false)
  }

  const handleSave = async () => {
    if (!selB || !formService || !formNote.trim()) return
    const [yearB, monthB] = selB.split('-').map(Number)
    setFormSaving(true)
    setFormError(null)
    setFormSuccess(false)
    try {
      const saved = await upsertNote({
        year: yearB, month: monthB,
        service_name: formService,
        note: formNote.trim(),
        note_date: formDate,
        resource_id: formResourceId || null,
        resource_name: formResourceName || null,
        filter_name: formPriceFilter || null,
        aws_profile: profile || 'default',
      })
      setNotes((prev) => new Map(prev).set(saved.service_name, saved))
      setFormSuccess(true)
      refreshSummary()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteNote = async (serviceName: string) => {
    const existing = notes.get(serviceName)
    if (!existing) return
    try {
      await deleteNote(existing.id)
      setNotes((prev) => { const m = new Map(prev); m.delete(serviceName); return m })
      if (formService === serviceName) setFormNote('')
      refreshSummary()
    } catch {}
  }

  const [diffFilter, setDiffFilter] = useState<'all' | 'increase' | 'decrease'>('all')

  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo   = today.toISOString().slice(0, 10)
  const [summaryFrom, setSummaryFrom]   = useState(defaultFrom)
  const [summaryTo, setSummaryTo]       = useState(defaultTo)
  const [summaryNotes, setSummaryNotes] = useState<NoteItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)

  const loadSummary = useCallback((from: string, to: string) => {
    setSummaryLoading(true)
    fetchNotesByRange(from, to, profile)
      .then(setSummaryNotes)
      .catch(() => setSummaryNotes([]))
      .finally(() => setSummaryLoading(false))
  }, [profile])

  useEffect(() => { loadSummary(summaryFrom, summaryTo) }, [profile])

  const refreshSummary = () => loadSummary(summaryFrom, summaryTo)

  const labelA = months.find((m) => `${m.year}-${m.month}` === selA)?.label ?? ''
  const labelB = months.find((m) => `${m.year}-${m.month}` === selB)?.label ?? ''

  const filteredRows = rows.filter((r) => {
    if (diffFilter === 'increase') return r.diff > 0
    if (diffFilter === 'decrease') return r.diff < 0
    return true
  })

  const totalA = rows.reduce((s, r) => s + r.cost_a, 0)
  const totalB = rows.reduce((s, r) => s + r.cost_b, 0)
  const totalDiff = totalB - totalA

  const hasResults = rows.length > 0 && !comparing

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
        @keyframes softGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08); }
        }

        .compare-container {
          margin: 0 auto;
          padding: 32px 28px;
          background: linear-gradient(135deg, #F5FDF8 0%, #F0F9F4 30%, #FEF7E8 70%, #F5FDF8 100%);
          min-height: 100vh;
          position: relative;
        }

        .compare-container::before {
          content: '';
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .compare-card {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          border-radius: 28px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.5s ease-out;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
        }

        .compare-card:hover {
          transform: translateY(-2px);
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.06);
          background: rgba(255, 255, 255, 0.94);
        }

        .filter-pill {
          padding: 6px 16px;
          border-radius: 40px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .filter-pill-active {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.5);
          color: #059669;
        }

        .filter-pill-inactive {
          background: transparent;
          border-color: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.4);
        }

        .filter-pill-inactive:hover {
          background: rgba(16, 185, 129, 0.05);
          color: #1F2937;
        }

        .compare-table-row {
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .compare-table-row:hover {
          background: rgba(16, 185, 129, 0.04);
        }

        .compare-table-row-active {
          background: rgba(16, 185, 129, 0.06);
          border-left: 2px solid #10B981;
        }

        .form-input-premium {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 13px;
          color: #1F2937;
          transition: all 0.2s ease;
        }

        .form-input-premium:focus {
          outline: none;
          border-color: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .form-input-premium::placeholder {
          color: rgba(107, 114, 128, 0.6);
        }

        .premium-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .premium-scrollbar::-webkit-scrollbar-track { background: rgba(16, 185, 129, 0.05); border-radius: 10px; }
        .premium-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 10px; }
        .premium-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
      `}</style>
      
      <div className="compare-container">
        {/* Month Selection Card */}
        <div className="compare-card mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                Compare Monthly Costs
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">Select two months to analyze cost differences and trends</p>

            {monthsLoading ? (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="spinner w-4 h-4 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm">Loading months...</span>
              </div>
            ) : months.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No data available — please run a sync first</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-6">
                <MonthSelect label="Baseline Month" months={months} value={selA} onChange={setSelA} exclude={selB} />
                <span className="text-emerald-600 text-sm pb-2 font-medium">VS</span>
                <MonthSelect label="Comparison Month" months={months} value={selB} onChange={setSelB} exclude={selA} />
                {(selA || selB) && (
                  <button
                    onClick={() => { setSelA(''); setSelB('') }}
                    className="text-xs text-emerald-600 hover:text-gray-900 pb-2 transition-colors"
                  >
                    ✕ Clear selection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {(comparing || compareError || hasResults) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compare Table */}
            <div className="lg:col-span-2 compare-card overflow-hidden">
              <div className="p-5 border-b border-emerald-100">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {labelA} <span className="text-emerald-600 font-normal">vs</span> {labelB}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {filteredRows.length} of {rows.length} services • Click any row to add a reason
                    </p>
                  </div>
                  {hasResults && (
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Total Difference</p>
                      <p className={`text-xl font-bold ${totalDiff > 0 ? 'text-amber-500' : totalDiff < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {fmtDiff(totalDiff)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              {hasResults && (
                <div className="px-5 py-3 border-b border-emerald-100 flex flex-wrap gap-2">
                  <span className="text-[10px] text-emerald-700 uppercase tracking-wider mr-2">Filter by:</span>
                  {[
                    { key: 'all', label: 'All Services', icon: '📊' },
                    { key: 'increase', label: 'Price Increase', icon: '▲', color: 'text-amber-400' },
                    { key: 'decrease', label: 'Price Decrease', icon: '▼', color: 'text-emerald-400' },
                  ].map(({ key, label, icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setDiffFilter(key as any)}
                      className={`filter-pill ${diffFilter === key ? 'filter-pill-active' : 'filter-pill-inactive'} border flex items-center gap-1`}
                    >
                      <span className={color || ''}>{icon}</span>
                      <span>{label}</span>
                      {key !== 'all' && (
                        <span className="text-[10px] opacity-60">
                          ({rows.filter(r => key === 'increase' ? r.diff > 0 : r.diff < 0).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-auto premium-scrollbar" style={{ maxHeight: '500px' }}>
                {comparing ? (
                  <div className="flex items-center justify-center gap-3 py-16">
                    <div className="spinner w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Comparing services...</span>
                  </div>
                ) : compareError ? (
                  <div className="p-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-red-400">{compareError}</span>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/95 backdrop-blur">
                      <tr className="text-[11px] text-emerald-700 uppercase tracking-wider border-b border-emerald-200">
                        <th className="px-5 py-3 text-left font-semibold">Service</th>
                        <th className="py-3 text-right font-semibold">{labelA}</th>
                        <th className="py-3 text-right font-semibold">{labelB}</th>
                        <th className="py-3 text-right font-semibold pr-5">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const isSelected = formService === row.service_name
                        const existingNote = notes.get(row.service_name)
                        return (
                          <tr
                            key={row.service_name}
                            onClick={() => handleRowClick(row.service_name)}
                            className={`compare-table-row ${isSelected ? 'compare-table-row-active' : ''}`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{row.service_name}</span>
                                {existingNote && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Note
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right font-mono text-gray-500">
                              {row.cost_a > 0 ? fmt.format(row.cost_a) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="py-3 text-right font-mono text-gray-500">
                              {row.cost_b > 0 ? fmt.format(row.cost_b) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={`py-3 text-right font-mono font-semibold pr-5 ${
                              row.diff > 0 ? 'text-amber-500' : row.diff < 0 ? 'text-emerald-600' : 'text-gray-400'
                            }`}>
                              {row.diff === 0 ? '—' : fmtDiff(row.diff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-white/95 backdrop-blur border-t-2 border-emerald-200">
                      <tr className="font-semibold">
                        <td className="px-5 py-3 text-emerald-700">Total</td>
                        <td className="py-3 text-right font-mono text-gray-800">{fmt.format(totalA)}</td>
                        <td className="py-3 text-right font-mono text-gray-800">{fmt.format(totalB)}</td>
                        <td className={`py-3 text-right font-mono pr-5 ${totalDiff > 0 ? 'text-amber-500' : totalDiff < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {fmtDiff(totalDiff)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            {/* Note Form */}
            {canAddReason && hasResults && selB && (
              <div className="compare-card">
                <div className="p-5 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h3 className="text-base font-semibold text-gray-900">Add Reason</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">For {labelB}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1.5 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="form-input-premium w-full"
                    />
                  </div>

                  {/* Service Select */}
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1.5 uppercase tracking-wider">Service</label>
                    <select
                      value={formService}
                      onChange={(e) => {
                        setFormService(e.target.value)
                        setFormNote('')
                        setFormPriceFilter('')
                        setFormSuccess(false)
                      }}
                      className="form-input-premium w-full appearance-none"
                    >
                      <option value="">— Select service —</option>
                      {rows.map((r) => (
                        <option key={r.service_name} value={r.service_name}>
                          {r.service_name}
                        </option>
                      ))}
                    </select>
                    {formService && notes.has(formService) && (
                      <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editing existing reason
                      </p>
                    )}
                  </div>

                  {/* Resource Selector */}
                  {formService && (
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 mb-1.5 uppercase tracking-wider flex items-center gap-2">
                        Resource
                        {resourcesLoading && (
                          <div className="spinner w-3 h-3 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                        )}
                      </label>
                      {!resourcesLoading && !resourcesSupported && resources.length === 0 && (
                        <p className="text-[11px] text-gray-400 italic">Not supported for this service</p>
                      )}
                      {!resourcesLoading && resources.length > 0 && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="🔍 Search resources..."
                            value={resourceSearch}
                            onChange={(e) => setResourceSearch(e.target.value)}
                            className="form-input-premium w-full text-sm"
                          />
                          <select
                            size={4}
                            value={formResourceId}
                            onChange={(e) => {
                              const id = e.target.value
                              const found = resources.find((r) => r.id === id)
                              setFormResourceId(id)
                              setFormResourceName(found?.name ?? id)
                            }}
                            className="form-input-premium w-full"
                          >
                            <option value="">— No specific resource —</option>
                            {resources
                              .filter((r) =>
                                !resourceSearch ||
                                r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
                                r.id.toLowerCase().includes(resourceSearch.toLowerCase())
                              )
                              .map((r) => (
                                <option key={r.id} value={r.id} title={r.detail}>
                                  {r.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1.5 uppercase tracking-wider">Price Trend</label>
                    <select
                      value={formPriceFilter}
                      onChange={(e) => setFormPriceFilter(e.target.value as any)}
                      className="form-input-premium w-full appearance-none"
                    >
                      <option value="">— Select —</option>
                      <option value="price_up">▲ Price Increase</option>
                      <option value="price_down">▼ Price Decrease</option>
                    </select>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1.5 uppercase tracking-wider">Reason / Note</label>
                    <textarea
                      value={formNote}
                      onChange={(e) => { setFormNote(e.target.value); setFormSuccess(false) }}
                      rows={4}
                      placeholder="e.g., EC2 scale-out for load test, RDS instance upgrade..."
                      className="form-input-premium w-full resize-none"
                    />
                  </div>

                  {/* Diff Preview */}
                  {formService && (() => {
                    const row = rows.find(r => r.service_name === formService)
                    if (!row || row.diff === 0) return null
                    return (
                      <div className={`rounded-xl p-3 text-sm flex items-center justify-between ${
                        row.diff > 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'
                      }`}>
                        <span className="text-slate-300 text-xs truncate pr-2">{row.service_name}</span>
                        <span className={`font-mono font-bold ${row.diff > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {fmtDiff(row.diff)}
                        </span>
                      </div>
                    )
                  })()}

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={formSaving || !formService || !formNote.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all relative overflow-hidden group"
                  >
                    {formSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <span>Save Reason</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                  </button>

                  {formSuccess && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Saved successfully!</span>
                    </div>
                  )}
                  {formError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!comparing && !compareError && rows.length === 0 && selA && selB && (
          <div className="compare-card p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-emerald-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-400 text-sm">No service data available for the selected months</p>
          </div>
        )}

        {/* Summary Section */}
        <div className="compare-card mt-6 overflow-hidden">
          <div className="p-5 border-b border-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-base font-semibold text-gray-900">Summary of Billing Differences</h3>
                </div>
                <p className="text-xs text-gray-500">
                  {summaryLoading ? 'Loading...' : `${summaryNotes.length} reason${summaryNotes.length !== 1 ? 's' : ''} recorded`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="date"
                    value={summaryFrom}
                    onChange={(e) => {
                      setSummaryFrom(e.target.value)
                      loadSummary(e.target.value, summaryTo)
                    }}
                    className="bg-transparent border-none text-gray-700 text-xs focus:outline-none"
                  />
                  <span className="text-emerald-600">to</span>
                  <input
                    type="date"
                    value={summaryTo}
                    onChange={(e) => {
                      setSummaryTo(e.target.value)
                      loadSummary(summaryFrom, e.target.value)
                    }}
                    className="bg-transparent border-none text-gray-700 text-xs focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setSummaryFrom(defaultFrom)
                    setSummaryTo(defaultTo)
                    loadSummary(defaultFrom, defaultTo)
                  }}
                  className="text-xs text-emerald-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => printSummaryPDF(summaryNotes, summaryFrom, summaryTo)}
                  disabled={summaryNotes.length === 0}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-auto premium-scrollbar" style={{ maxHeight: '400px' }}>
            {summaryLoading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <div className="spinner w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading summary...</span>
              </div>
            ) : summaryNotes.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="w-12 h-12 mx-auto text-emerald-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-400 text-sm">No reasons recorded for this period</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/95 backdrop-blur">
                  <tr className="text-[11px] text-emerald-700 uppercase tracking-wider border-b border-emerald-200">
                    <th className="px-5 py-3 text-left font-semibold w-32">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Service</th>
                    <th className="px-4 py-3 text-left font-semibold w-44">Resource</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason / Note</th>
                   </tr>
                </thead>
                <tbody>
                  {summaryNotes.map((note, i) => (
                    <tr key={note.id} className={`border-b border-emerald-100 hover:bg-emerald-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50' : ''}`}>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(note.note_date)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{note.service_name}</td>
                      <td className="px-4 py-3">
                        {note.resource_name ? (
                          <span className="text-emerald-600 text-xs" title={note.resource_id ?? ''}>{note.resource_name}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs leading-relaxed">{note.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}