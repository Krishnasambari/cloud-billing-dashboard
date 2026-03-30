import { useState } from 'react'
import { useMonthlyCosts } from '../hooks/useMonthlyCosts'
import { useServiceCosts } from '../hooks/useServiceCosts'
import { useExchangeRate } from '../hooks/useExchangeRate'
import MonthlyBarChart from '../components/charts/MonthlyBarChart'
import ServiceBarChart from '../components/charts/ServiceBarChart'
import CostCard from '../components/ui/CostCard'

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

interface Props {
  cards: Record<string, boolean>
  profile: string
}

function can(cards: Record<string, boolean>, key: string): boolean {
  return cards[key] !== false
}

/** Project current month's MTD spend to full month end */
function calcForecast(cost: number, label: string): { projected: number; daysElapsed: number; daysInMonth: number } | null {
  try {
    // label is like "Mar 2026"
    const [mon, yr] = label.split(' ')
    const monthIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(mon)
    if (monthIdx === -1) return null
    const year = parseInt(yr)
    const today = new Date()
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
    // days elapsed: if label matches current month use today, else assume full month
    const isCurrent = today.getFullYear() === year && today.getMonth() === monthIdx
    const daysElapsed = isCurrent ? today.getDate() : daysInMonth
    if (daysElapsed === 0) return null
    const projected = (cost / daysElapsed) * daysInMonth
    return { projected, daysElapsed, daysInMonth }
  } catch { return null }
}

export default function Dashboard({ cards, profile }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const exchangeRate = useExchangeRate()
  const { data: monthlyCosts, summary, isLoading, error } = useMonthlyCosts(profile)
  const { data: serviceData, isLoading: servicesLoading, error: servicesError } =
    useServiceCosts(selectedYear, selectedMonth, profile)

  const handleMonthSelect = (year: number, month: number) => {
    if (selectedYear === year && selectedMonth === month) {
      setSelectedYear(null)
      setSelectedMonth(null)
    } else {
      setSelectedYear(year)
      setSelectedMonth(month)
    }
  }

  const showChart    = can(cards, 'chart_monthly')
  const showService  = can(cards, 'chart_service')

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          {error} — click Sync from AWS to load data.
        </div>
      )}

      {/* Summary Cards */}
      {summary && (() => {
        const diff = summary.current_month.cost - summary.last_month.cost
        const forecast = calcForecast(summary.current_month.cost, summary.current_month.label)
        const projectedDiff = forecast ? forecast.projected - summary.last_month.cost : null

        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {can(cards, 'summary_this_month') && (
              <CostCard
                title="This Month"
                amount={summary.current_month.cost}
                exchangeRate={exchangeRate}
                subtitle={summary.current_month.label}
                trend={summary.mom_change_pct}
                highlight
                icon="📅"
              />
            )}
            {can(cards, 'summary_last_month') && (
              <CostCard
                title="Last Month"
                amount={summary.last_month.cost}
                exchangeRate={exchangeRate}
                subtitle={summary.last_month.label}
                icon="🗓️"
              />
            )}
            {can(cards, 'summary_ytd') && (
              <CostCard
                title="Year to Date"
                amount={summary.ytd.cost}
                exchangeRate={exchangeRate}
                subtitle={String(summary.ytd.year)}
                icon="📊"
              />
            )}
            {can(cards, 'summary_mom') && (
              <CostCard
                title="MoM Change"
                amount={0}
                exchangeRate={exchangeRate}
                isPercent
                percentValue={
                  summary.mom_change_pct !== null
                    ? `${summary.mom_change_pct > 0 ? '+' : ''}${summary.mom_change_pct.toFixed(1)}%`
                    : '—'
                }
                diffAmount={diff}
                subtitle="vs previous month"
                trend={summary.mom_change_pct}
                icon={summary.mom_change_pct !== null && summary.mom_change_pct < 0 ? '📉' : '📈'}
              />
            )}
            {can(cards, 'summary_forecast') && forecast && (
              <CostCard
                title="Forecast (Month End)"
                amount={forecast.projected}
                exchangeRate={exchangeRate}
                subtitle={`Based on ${forecast.daysElapsed}/${forecast.daysInMonth} days`}
                icon="🔮"
                forecastBadge={
                  projectedDiff !== null
                    ? `${projectedDiff > 0 ? '▲' : '▼'} ${Math.abs(projectedDiff / summary.last_month.cost * 100).toFixed(1)}% vs last month`
                    : undefined
                }
                forecastBadgeColor={projectedDiff !== null && projectedDiff > 0 ? 'red' : 'green'}
              />
            )}
          </div>
        )
      })()}

      {/* Monthly Bar Chart */}
      {showChart && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-800/60">
            <div>
              <h2 className="text-sm font-semibold text-white">Monthly Spend</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedYear && selectedMonth
                  ? 'Click the same bar again to deselect'
                  : 'Click any bar to drill into services'}
              </p>
            </div>
            {selectedYear && selectedMonth && (
              <button
                onClick={() => { setSelectedYear(null); setSelectedMonth(null) }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>

          <div className="px-4 py-5">
            {isLoading ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-slate-600">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-xs">Loading billing data...</span>
              </div>
            ) : monthlyCosts.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-slate-600">
                <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-500">No billing data yet</p>
                  <p className="text-xs text-slate-600 mt-1">Click "Sync from AWS" in the header to load your cost data</p>
                </div>
              </div>
            ) : (
              <MonthlyBarChart
                data={monthlyCosts}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onMonthSelect={handleMonthSelect}
              />
            )}
          </div>
        </div>
      )}

      {/* Service Breakdown */}
      {showService && selectedYear && selectedMonth && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-800/60 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Service Breakdown</h2>
                <span className="text-xs font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
                  {serviceData?.label ?? `${selectedYear}/${String(selectedMonth).padStart(2, '0')}`}
                </span>
              </div>
              {serviceData && (
                <p className="text-xs text-slate-500 mt-1">
                  {serviceData.count} services · total {fmt.format(serviceData.total_cost)}
                </p>
              )}
            </div>
          </div>

          <div className="px-4 py-5">
            {servicesLoading ? (
              <div className="h-[280px] flex flex-col items-center justify-center gap-3 text-slate-600">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-xs">Loading services...</span>
              </div>
            ) : servicesError ? (
              <div className="text-sm text-red-400 px-2">{servicesError}</div>
            ) : serviceData ? (
              <div className="space-y-6">
                <ServiceBarChart
                  services={serviceData.services}
                />
                <div className="border-t border-slate-800/60 pt-5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2">
                    Full Breakdown
                  </p>
                  <table className="w-full table-fixed text-xs">
                    <colgroup>
                      <col className="w-[55%]" />
                      <col className="w-[25%]" />
                      <col className="w-[20%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="pb-2 px-2 text-left font-medium">Service</th>
                        <th className="pb-2 text-right font-medium">Cost</th>
                        <th className="pb-2 pr-2 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceData.services.map((s, i) => (
                        <tr
                          key={s.service_name}
                          className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors ${i === 0 ? 'text-slate-200' : 'text-slate-400'}`}
                        >
                          <td className="py-2 px-2 truncate">{s.service_name}</td>
                          <td className="py-2 text-right font-mono text-slate-200">{fmt.format(s.cost)}</td>
                          <td className="py-2 pr-2 text-right text-slate-500">{s.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
