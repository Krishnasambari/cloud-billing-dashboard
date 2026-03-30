import { useState, useEffect, useCallback } from 'react'
import { fetchMonthlyCosts, fetchServiceCosts } from '../api/costs'
import { fetchNotes, fetchNotesByRange, upsertNote, deleteNote } from '../api/notes'
import { fetchResources } from '../api/resources'
import type { ResourceItem } from '../api/resources'
import type { MonthlyCostItem, ServiceCostItem, NoteItem } from '../types/billing'

const fmtDate = (iso: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 32px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
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
  <h1>Summary of the billing difference</h1>
  <p class="meta">Period: ${fromLabel} &mdash; ${toLabel} &nbsp;&bull;&nbsp; ${notes.length} record${notes.length !== 1 ? 's' : ''}</p>
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
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
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

  // Notes keyed by service_name
  const [notes, setNotes] = useState<Map<string, NoteItem>>(new Map())
  const [notesLoading, setNotesLoading] = useState(false)

  // Form state
  const [formService, setFormService] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  // Resource state
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesSupported, setResourcesSupported] = useState(false)
  const [formResourceId, setFormResourceId] = useState('')
  const [formResourceName, setFormResourceName] = useState('')
  const [resourceSearch, setResourceSearch] = useState('')

  // Load months for dropdowns
  useEffect(() => {
    setMonths([])
    setMonthsLoading(true)
    fetchMonthlyCosts({ limit: 24, profile })
      .then((res) => setMonths(res.data))
      .catch(() => setMonths([]))
      .finally(() => setMonthsLoading(false))
  }, [profile])

  // Run comparison when both months selected
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

  // Load notes for Month B whenever it changes
  useEffect(() => {
    if (!selB) { setNotes(new Map()); return }
    const [yearB, monthB] = selB.split('-').map(Number)
    setNotesLoading(true)
    fetchNotes(yearB, monthB)
      .then((items) => {
        const m = new Map<string, NoteItem>()
        items.forEach((n) => m.set(n.service_name, n))
        setNotes(m)
      })
      .catch(() => setNotes(new Map()))
      .finally(() => setNotesLoading(false))
  }, [selB])

  // Reset form when Month B changes
  useEffect(() => {
    setFormService('')
    setFormNote('')
    setFormError(null)
    setResources([])
    setFormResourceId('')
    setFormResourceName('')
    setResourceSearch('')
  }, [selB])

  // Fetch resources when service changes
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
        // Pre-fill resource if existing note has one
        const existing = notes.get(formService)
        if (existing?.resource_id) {
          setFormResourceId(existing.resource_id)
          setFormResourceName(existing.resource_name ?? '')
        }
      })
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false))
  }, [formService])

  // Click a row → pre-fill form
  const handleRowClick = (serviceName: string) => {
    setFormService(serviceName)
    setFormNote(notes.get(serviceName)?.note ?? '')
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

  // ── Summary section (independent of comparison) ───────────────────────────
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo   = today.toISOString().slice(0, 10)
  const [summaryFrom, setSummaryFrom]   = useState(defaultFrom)
  const [summaryTo, setSummaryTo]       = useState(defaultTo)
  const [summaryNotes, setSummaryNotes] = useState<NoteItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)

  const loadSummary = useCallback((from: string, to: string) => {
    setSummaryLoading(true)
    fetchNotesByRange(from, to)
      .then(setSummaryNotes)
      .catch(() => setSummaryNotes([]))
      .finally(() => setSummaryLoading(false))
  }, [])

  useEffect(() => { loadSummary(summaryFrom, summaryTo) }, [])

  // Reload summary whenever a note is saved or deleted
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
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

      {/* Filter row */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Select months to compare</p>
        {monthsLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : months.length === 0 ? (
          <p className="text-sm text-slate-500">No data — run a sync first.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <MonthSelect label="Month A · Baseline" months={months} value={selA} onChange={setSelA} exclude={selB} />
            <span className="text-slate-600 text-sm pb-2">vs</span>
            <MonthSelect label="Month B · Comparison" months={months} value={selB} onChange={setSelB} exclude={selA} />
            {(selA || selB) && (
              <button onClick={() => { setSelA(''); setSelB('') }} className="text-xs text-slate-500 hover:text-white pb-2">
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results + Note form side-by-side */}
      {(comparing || compareError || hasResults) && (
        <div className="flex gap-5 items-start">

          {/* Compare table — left, takes most space */}
          <div className="flex-1 min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {labelA} <span className="text-slate-600 font-normal">vs</span> {labelB}
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {filteredRows.length} of {rows.length} services · click a row to add a reason
                </p>
              </div>
              {hasResults && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">Total diff</p>
                  <p className={`text-base font-bold ${totalDiff > 0 ? 'text-red-400' : totalDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {fmtDiff(totalDiff)}
                  </p>
                </div>
              )}
            </div>

            {/* Diff filter pills */}
            {hasResults && (
              <div className="px-5 py-2.5 border-b border-slate-800/60 flex items-center gap-2">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider mr-1">Filter</span>
                {([
                  { key: 'all', label: 'All', cls: 'text-slate-400 border-slate-700 hover:border-slate-500' },
                  { key: 'increase', label: '▲ Price Increase', cls: 'text-red-400 border-red-500/30 hover:border-red-400/50' },
                  { key: 'decrease', label: '▼ Price Decrease', cls: 'text-emerald-400 border-emerald-500/30 hover:border-emerald-400/50' },
                ] as { key: 'all'|'increase'|'decrease'; label: string; cls: string }[]).map(({ key, label, cls }) => (
                  <button
                    key={key}
                    onClick={() => setDiffFilter(key)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors font-medium ${cls} ${diffFilter === key ? 'bg-slate-800' : 'bg-transparent'}`}
                  >
                    {label}
                    {key === 'increase' && <span className="ml-1 opacity-50">({rows.filter(r => r.diff > 0).length})</span>}
                    {key === 'decrease' && <span className="ml-1 opacity-50">({rows.filter(r => r.diff < 0).length})</span>}
                  </button>
                ))}
              </div>
            )}

            {comparing ? (
              <div className="h-32 flex items-center justify-center text-slate-600 text-xs gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Comparing...
              </div>
            ) : compareError ? (
              <p className="p-5 text-sm text-red-400">{compareError}</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full table-fixed text-xs">
                  <colgroup>
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                      <th className="px-4 py-2 text-left font-semibold">Service</th>
                      <th className="py-2 text-right font-semibold">{labelA}</th>
                      <th className="py-2 text-right font-semibold">{labelB}</th>
                      <th className="py-2 text-right font-semibold">Diff</th>
                      {canAddReason && <th className="px-4 py-2 text-left font-semibold">Reason</th>}
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
                          className={`border-b border-slate-800/40 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500/20'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-4 py-1.5 truncate text-slate-300">{row.service_name}</td>
                          <td className="py-1.5 text-right font-mono text-slate-400">
                            {row.cost_a > 0 ? fmt.format(row.cost_a) : <span className="text-slate-700">—</span>}
                          </td>
                          <td className="py-1.5 text-right font-mono text-slate-400">
                            {row.cost_b > 0 ? fmt.format(row.cost_b) : <span className="text-slate-700">—</span>}
                          </td>
                          <td className={`py-1.5 text-right font-mono font-semibold ${
                            row.diff > 0 ? 'text-red-400' : row.diff < 0 ? 'text-emerald-400' : 'text-slate-600'
                          }`}>
                            {row.diff === 0 ? '—' : fmtDiff(row.diff)}
                          </td>
                          {canAddReason && (
                          <td className="px-4 py-1.5">
                            {existingNote ? (
                              <div className="flex items-start justify-between gap-1 group">
                                <div className="min-w-0">
                                  {existingNote.resource_name && (
                                    <p className="text-[10px] text-blue-400 truncate mb-0.5">{existingNote.resource_name}</p>
                                  )}
                                  <span
                                    className="text-slate-300 leading-tight line-clamp-2"
                                    title={existingNote.note}
                                  >
                                    {existingNote.note}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(row.service_name) }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 shrink-0 transition-opacity"
                                  title="Delete reason"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : notesLoading ? (
                              <span className="text-slate-700">…</span>
                            ) : (
                              <span className="text-slate-700 italic">—</span>
                            )}
                          </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 font-semibold text-white">
                      <td className="px-4 py-2">Total</td>
                      <td className="py-2 text-right font-mono">{fmt.format(totalA)}</td>
                      <td className="py-2 text-right font-mono">{fmt.format(totalB)}</td>
                      <td className={`py-2 text-right font-mono ${totalDiff > 0 ? 'text-red-400' : totalDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {fmtDiff(totalDiff)}
                      </td>
                      {canAddReason && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Note form — right panel, fixed width */}
          {canAddReason && hasResults && selB && (
            <div className="w-72 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/60">
                <h3 className="text-sm font-semibold text-white">Add Reason</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">For {labelB}</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Service */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Service</label>
                  <select
                    value={formService}
                    onChange={(e) => {
                      setFormService(e.target.value)
                      setFormNote(notes.get(e.target.value)?.note ?? '')
                      setFormSuccess(false)
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Select service —</option>
                    {rows.map((r) => (
                      <option key={r.service_name} value={r.service_name}>
                        {r.service_name}
                      </option>
                    ))}
                  </select>
                  {formService && notes.has(formService) && (
                    <p className="text-[10px] text-blue-400">Editing existing reason</p>
                  )}
                </div>

                {/* Resource selector — shown when service is selected */}
                {formService && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      Resource
                      {resourcesLoading && (
                        <svg className="animate-spin w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      )}
                    </label>

                    {resourcesLoading ? (
                      <p className="text-[10px] text-slate-600">Loading resources...</p>
                    ) : !resourcesSupported && resources.length === 0 ? (
                      <p className="text-[10px] text-slate-600 italic">Not supported for this service</p>
                    ) : resources.length === 0 ? (
                      <p className="text-[10px] text-slate-600 italic">No resources found</p>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Search */}
                        <input
                          type="text"
                          placeholder="Search resources..."
                          value={resourceSearch}
                          onChange={(e) => setResourceSearch(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {/* Native select — always works */}
                        <select
                          size={5}
                          value={formResourceId}
                          onChange={(e) => {
                            const id = e.target.value
                            const found = resources.find((r) => r.id === id)
                            setFormResourceId(id)
                            setFormResourceName(found?.name ?? id)
                          }}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-auto"
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
                                {r.name}{r.detail ? ` · ${r.detail}` : ''}
                              </option>
                            ))}
                        </select>

                        {/* Selected confirmation */}
                        {formResourceId && (
                          <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                            <span className="text-[10px] text-blue-400 truncate">{formResourceName || formResourceId}</span>
                            <button
                              type="button"
                              onClick={() => { setFormResourceId(''); setFormResourceName('') }}
                              className="text-slate-500 hover:text-red-400 ml-2 shrink-0 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reason / Note</label>
                  <textarea
                    value={formNote}
                    onChange={(e) => { setFormNote(e.target.value); setFormSuccess(false) }}
                    rows={4}
                    placeholder="e.g. EC2 scale-out for load test in March"
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Selected diff preview */}
                {formService && (() => {
                  const row = rows.find(r => r.service_name === formService)
                  if (!row || row.diff === 0) return null
                  return (
                    <div className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between ${
                      row.diff > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
                    }`}>
                      <span className="text-slate-400 truncate pr-2">{row.service_name.replace(/^Amazon\s+|^AWS\s+/, '')}</span>
                      <span className={`font-mono font-bold shrink-0 ${row.diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fmtDiff(row.diff)}
                      </span>
                    </div>
                  )
                })()}

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={formSaving || !formService || !formNote.trim()}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors"
                >
                  {formSaving ? 'Saving...' : 'Save Reason'}
                </button>

                {formSuccess && (
                  <p className="text-xs text-emerald-400 text-center">✓ Saved</p>
                )}
                {formError && (
                  <p className="text-xs text-red-400">{formError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!comparing && !compareError && rows.length === 0 && selA && selB && (
        <p className="text-center text-slate-600 text-sm py-10">No service data for selected months.</p>
      )}

      {/* ── Summary of billing difference ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/60 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Summary of the billing difference</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {summaryLoading ? 'Loading…' : `${summaryNotes.length} reason${summaryNotes.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Date range + Download */}
          <div className="flex flex-wrap items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={summaryFrom}
              onChange={(e) => {
                setSummaryFrom(e.target.value)
                loadSummary(e.target.value, summaryTo)
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5
                         focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-600 text-xs">to</span>
            <input
              type="date"
              value={summaryTo}
              onChange={(e) => {
                setSummaryTo(e.target.value)
                loadSummary(summaryFrom, e.target.value)
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5
                         focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                setSummaryFrom(defaultFrom)
                setSummaryTo(defaultTo)
                loadSummary(defaultFrom, defaultTo)
              }}
              className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Reset to current month"
            >
              Reset
            </button>

            {/* PDF Download */}
            <button
              onClick={() => printSummaryPDF(summaryNotes, summaryFrom, summaryTo)}
              disabled={summaryNotes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Table */}
        {summaryLoading ? (
          <div className="flex items-center justify-center gap-2 text-slate-600 text-xs py-10">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading summary…
          </div>
        ) : summaryNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-600">
            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No reasons recorded for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/40">
                  <th className="px-5 py-3 text-left font-semibold w-32">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Service</th>
                  <th className="px-4 py-3 text-left font-semibold w-44">Resource</th>
                  <th className="px-4 py-3 text-left font-semibold">Reason / Note</th>
                </tr>
              </thead>
              <tbody>
                {summaryNotes.map((note, i) => (
                  <tr key={note.id} className={`border-b border-slate-800/40 ${i % 2 !== 0 ? 'bg-slate-800/20' : ''}`}>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{fmtDate(note.note_date)}</td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{note.service_name}</td>
                    <td className="px-4 py-3">
                      {note.resource_name
                        ? <span className="text-blue-400" title={note.resource_id ?? ''}>{note.resource_name}</span>
                        : <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300 leading-relaxed">{note.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
