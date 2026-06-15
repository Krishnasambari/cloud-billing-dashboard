import { useState, useEffect } from 'react'
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
  cloud: string
  cloudAccount: string
}

function can(cards: Record<string, boolean>, key: string): boolean {
  return cards[key] !== false
}

function calcForecast(cost: number, label: string): { projected: number; daysElapsed: number; daysInMonth: number } | null {
  try {
    const [mon, yr] = label.split(' ')
    const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mon)
    if (monthIdx === -1) return null
    const year = parseInt(yr)
    const today = new Date()
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
    const isCurrent = today.getFullYear() === year && today.getMonth() === monthIdx
    const daysElapsed = isCurrent ? today.getDate() : daysInMonth
    if (daysElapsed === 0) return null
    const projected = (cost / daysElapsed) * daysInMonth
    return { projected, daysElapsed, daysInMonth }
  } catch { return null }
}

export default function Dashboard({ cards, cloud, cloudAccount }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const [accounts, setAccounts] = useState<Array<{cloud:string, cloud_account:string}>>([])
  const [selectedAccount, setSelectedAccount] = useState<string>(cloudAccount || '')
  const [syncLoading, setSyncLoading] = useState<boolean>(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const exchangeRate = useExchangeRate()
  const { data: monthlyCosts, summary, isLoading, error, reload: reloadMonthly } = useMonthlyCosts(cloud, selectedAccount)
  const { data: serviceData, isLoading: servicesLoading, error: servicesError } =
    useServiceCosts(selectedYear, selectedMonth, cloud, selectedAccount)

  // Fetch available accounts on mount
  useEffect(() => {
    fetch('/api/sync/accounts')
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || [])
        if (!selectedAccount && data.accounts && data.accounts.length > 0) {
          setSelectedAccount(data.accounts[0].cloud_account)
        }
      })
      .catch((e) => console.error('Failed to load accounts', e))
  }, [])

  // Sync handler – triggers backend sync and polls until finished
  const handleSync = async () => {
    if (!selectedAccount) {
      setSyncError('No cloud account selected')
      return
    }
    setSyncLoading(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud: 'aws',
          cloud_account: selectedAccount,
          months_back: 12,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      // Poll status endpoint until sync completes
      const pollStatus = async () => {
        const statusRes = await fetch('/api/sync/status')
        const statusJson = await statusRes.json()
        if (statusJson.status === 'running') {
          setTimeout(pollStatus, 2000)
        } else {
          await reloadMonthly()
          setSyncLoading(false)
        }
      }
      pollStatus()
    } catch (e: any) {
      setSyncError(e.message || 'Sync failed')
      setSyncLoading(false)
    }
  }

  const handleMonthSelect = (year: number, month: number) => {
    if (selectedYear === year && selectedMonth === month) {
      setSelectedYear(null)
      setSelectedMonth(null)
    } else {
      setSelectedYear(year)
      setSelectedMonth(month)
    }
  }

  const showChart = can(cards, 'chart_monthly')
  const showService = can(cards, 'chart_service')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&family=SF+Pro+Display:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* --- Base & Reset --- */
        .dashboard-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 32px 40px;
          background: linear-gradient(145deg, #F8FAFF 0%, #F1F4F9 100%);
          min-height: 100vh;
        }

        /* --- Cards Grid (Premium) --- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
          }
          .dashboard-container {
            padding: 24px 28px;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
          }
          .stats-grid {
            gap: 12px;
          }
        }

        /* --- Chart Card (Elevated) --- */
        .chart-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(0px);
          border-radius: 28px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02);
          overflow: hidden;
          margin-bottom: 28px;
          transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
        }

        .chart-card:hover {
          box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .chart-card--wide {
          min-height: 460px;
        }

        /* --- Header --- */
        .chart-header {
          padding: 24px 32px 20px;
          border-bottom: 1px solid #EFF3F8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          background: #FFFFFF;
        }

        .chart-title-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #10182F;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: -0.3px;
        }

        .chart-title svg {
          color: #4F46E5;
          stroke-width: 1.8;
          width: 22px;
          height: 22px;
        }

        .chart-subtitle {
          font-size: 13px;
          color: #5A6E8A;
          font-weight: 450;
          margin-top: 2px;
        }

        .chart-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F4F6FD;
          border: none;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          color: #2D3A5E;
          letter-spacing: -0.2px;
        }

        .clear-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          padding: 6px 16px;
          border-radius: 34px;
          color: #475569;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .clear-button:hover {
          background: #F8FAFE;
          border-color: #CBD5E1;
          color: #0F172A;
          transform: scale(0.96);
        }

        /* --- Chart Content Area --- */
        .chart-content {
          padding: 24px 32px 32px;
        }

        .chart-content--service {
          padding: 20px 32px 32px;
        }

        /* --- Service Meta (Top Bar) --- */
        .service-meta {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .service-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F0F4FE;
          border-radius: 40px;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #1E293B;
        }

        .service-count {
          font-size: 13px;
          font-weight: 450;
          color: #5A6E8A;
          background: #F1F5F9;
          padding: 4px 12px;
          border-radius: 30px;
        }

        .service-total {
          font-size: 20px;
          font-weight: 700;
          color: #0F172A;
          font-family: 'Inter', monospace;
          letter-spacing: -0.3px;
          background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 1px 0 rgba(0,0,0,0.02);
        }

        /* --- Table (Clean & Aligned) --- */
        .table-container {
          margin-top: 28px;
          border-radius: 20px;
          background: #FFFFFF;
          border: 1px solid #EDF2F7;
          overflow: auto;
        }

        .table-title {
          font-size: 12px;
          font-weight: 600;
          color: #6F8FAC;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 16px 20px 0 20px;
        }

        .data-table {
          width: 100%;
          font-size: 13px;
          border-collapse: collapse;
        }

        .data-table th {
          text-align: left;
          padding: 14px 20px;
          color: #54708F;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          background: #FCFDFF;
          border-bottom: 1px solid #EFF3F8;
        }

        .data-table td {
          padding: 14px 20px;
          border-bottom: 1px solid #F4F7FC;
          color: #1E2A44;
          font-weight: 500;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table th:last-child,
        .data-table td:last-child {
          text-align: right;
        }

        .data-table tbody tr {
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .data-table tbody tr:hover {
          background: #F8FAFF;
        }

        .service-name {
          font-weight: 600;
          color: #0F172A;
          letter-spacing: -0.2px;
        }

        .top-service .service-name {
          font-weight: 700;
          color: #4F46E5;
        }

        .service-cost {
          font-family: 'Inter', monospace;
          font-weight: 600;
          letter-spacing: -0.2px;
        }

        .service-percentage {
          color: #66809C;
          font-weight: 500;
        }

        /* --- Loading & Empty States --- */
        .loading-container,
        .empty-container {
          height: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .spinner {
          width: 34px;
          height: 34px;
          border: 3px solid #E2E8F0;
          border-top-color: #4F46E5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          color: #66809C;
          font-size: 13px;
          font-weight: 500;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          opacity: 0.4;
          color: #4F46E5;
        }

        .empty-title {
          font-size: 15px;
          font-weight: 600;
          color: #1E293B;
        }

        .empty-description {
          font-size: 12px;
          color: #7E95B0;
        }

        /* --- Error Banner (Refined) --- */
        .error-banner {
          background: #FFF9F5;
          border-left: 4px solid #E26D5C;
          border-radius: 16px;
          padding: 14px 22px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .error-icon {
          width: 20px;
          height: 20px;
          color: #E26D5C;
        }

        .error-text {
          color: #B4533C;
          font-size: 13px;
          font-weight: 500;
        }

        /* --- Recharts Overrides (Modern) --- */
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: #E9EFF5;
          stroke-dasharray: 5 5;
        }

        .recharts-text {
          fill: #6F8FAC;
          font-size: 11px;
          font-weight: 450;
        }

        .recharts-default-tooltip {
          background: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(2px);
          border: 1px solid #E9EDF2 !important;
          border-radius: 20px !important;
          padding: 10px 16px !important;
          box-shadow: 0 12px 24px -12px rgba(0, 0, 0, 0.12) !important;
        }

        /* --- Animations --- */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .stats-grid > * {
          animation: fadeInUp 0.35s ease-out forwards;
        }

        .chart-card {
          animation: fadeInUp 0.4s ease-out;
        }

        /* Custom scroll */
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: #EFF3F8;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #C0D0E5;
          border-radius: 10px;
        }
      `}</style>

      <div className="dashboard-container">
        {/* Error banner - clean style */}
        {error && (
          <div className="error-banner">
            <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="error-text">{error} — Click Sync from AWS to load data.</span>
          </div>
        )}
        {syncError && (
          <div className="error-banner" style={{ marginTop: '12px' }}>
            <span className="error-text">Sync error: {syncError}</span>
          </div>
        )}

        {/* Sync Controls – visible when accounts loaded */}
<div className="sync-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
  <select
    value={selectedAccount}
    onChange={(e) => setSelectedAccount(e.target.value)}
    className="clear-button"
    style={{ minWidth: '120px' }}
  >
    {accounts.map((a) => (
      <option key={a.cloud_account} value={a.cloud_account}>
        {a.cloud} / {a.cloud_account}
      </option>
    ))}
  </select>
  <button
    onClick={handleSync}
    className="clear-button"
    disabled={syncLoading}
  >
    {syncLoading ? 'Syncing...' : 'Sync'}
  </button>
</div>
{/* KPI Cards - symmetric grid with proper spacing */}
        {summary && (() => {
          const diff = summary.current_month.cost - summary.last_month.cost
          const forecast = calcForecast(summary.current_month.cost, summary.current_month.label)
          const projectedDiff = forecast ? forecast.projected - summary.last_month.cost : null

          return (
      <div className="stats-grid">
      {can(cards, 'summary_this_month') && (
        <CostCard
          title={<span className="font-semibold text-sm tracking-tight text-black">Current Month</span>}
          amount={summary.current_month.cost}
          exchangeRate={exchangeRate}
          subtitle={summary.current_month.label}
          trend={summary.mom_change_pct}
          highlight
          icon="📅"
          variant="primary"
        />
      )}

      {can(cards, 'summary_last_month') && (
        <CostCard
          title={<span className="font-semibold text-sm tracking-tight text-black">Previous Month</span>}
          amount={summary.last_month.cost}
          exchangeRate={exchangeRate}
          subtitle={summary.last_month.label}
          icon="🗓️"
          variant="neutral"
        />
      )}

      {can(cards, 'summary_mom') && (
        <CostCard
          title={<span className="font-semibold text-sm tracking-tight text-black">MoM Change</span>}
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
          variant="trend"
        />
      )}

      {can(cards, 'summary_forecast') && forecast && (
        <CostCard
          title={<span className="font-semibold text-sm tracking-tight text-black">Month End Forecast</span>}
          amount={forecast.projected}
          exchangeRate={exchangeRate}
          subtitle={`Based on ${forecast.daysElapsed}/${forecast.daysInMonth} days`}
          icon="🔮"
          forecastBadge={
            projectedDiff !== null
              ? `${projectedDiff > 0 ? '▲' : '▼'} ${Math.abs(
                  (projectedDiff / summary.last_month.cost) * 100
                ).toFixed(1)}% vs last month`
              : undefined
          }
          forecastBadgeColor={projectedDiff !== null && projectedDiff > 0 ? 'red' : 'green'}
          variant="forecast"
        />
      )}

      {can(cards, 'summary_ytd') && (
        <CostCard
          title={<span className="font-semibold text-sm tracking-tight text-black">Year to Date</span>}
          amount={summary.ytd.cost}
          exchangeRate={exchangeRate}
          subtitle={String(summary.ytd.year)}
          icon="📊"
          variant="ytd"
        />
      )}
            </div>
          )
        })()}

        {/* Monthly Bar Chart - Premium layout */}
        {showChart && (
          <div className="chart-card chart-card--wide">
            <div className="chart-header">
              <div className="chart-title-section">
                <div className="chart-title">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 13h4l3-7 4 10 3-6 4 3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 17h18" strokeLinecap="round" />
                  </svg>
                  Monthly Spend Analysis
                </div>
                <p className="chart-subtitle">
                  {selectedYear && selectedMonth
                    ? 'Click the same bar again to deselect and return to overview'
                    : 'Click any bar to drill into detailed service costs'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="chart-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Last 12 months
                </span>

                {selectedYear && selectedMonth && (
                  <button
                    onClick={() => { setSelectedYear(null); setSelectedMonth(null) }}
                    className="clear-button"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Selection
                  </button>
                )}
                {/* Account selector */}
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="clear-button"
                  style={{ minWidth: '120px' }}
                >
                  {accounts.map((a) => (
                    <option key={a.cloud_account} value={a.cloud_account}>
                      {a.cloud} / {a.cloud_account}
                    </option>
                  ))}
                </select>
                {/* Sync button */}
                <button
                  onClick={handleSync}
                  className="clear-button"
                  disabled={syncLoading}
                >
                  {syncLoading ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </div>

            <div className="chart-content">
              {isLoading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <span className="loading-text">Loading billing data...</span>
                </div>
              ) : monthlyCosts.length === 0 ? (
                <div className="empty-container">
                  <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <div className="empty-title">No billing data available</div>
                  <div className="empty-description">Click "Sync from AWS" in the header to load your cost data</div>
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

        {/* Service Breakdown - Aligned and refined */}
        {showService && selectedYear && selectedMonth && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title-section">
                <div className="chart-title">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" />
                    <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" strokeLinecap="round" />
                  </svg>
                  Service Cost Breakdown
                </div>
              </div>

              {serviceData && (
                <div className="service-meta">
                  <span className="service-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {serviceData.label ?? `${selectedYear}/${String(selectedMonth).padStart(2, '0')}`}
                  </span>
                  <span className="service-count">{serviceData.count} active services</span>
                  <span className="service-total">{fmt.format(serviceData.total_cost)}</span>
                </div>
              )}
            </div>

            <div className="chart-content chart-content--service">
              {servicesLoading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <span className="loading-text">Loading service data...</span>
                </div>
              ) : servicesError ? (
                <div className="error-banner" style={{ marginBottom: 0 }}>
                  <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="error-text">{servicesError}</span>
                </div>
              ) : serviceData ? (
                <div>
                  {/* Bar chart full width with improved spacing */}
                  <ServiceBarChart services={serviceData.services} />

                  {/* Detailed Table */}
                  <div className="table-container">
                    <div className="table-title">Detailed Service Breakdown</div>
                    <table className="data-table">
                      <colgroup>
                        <col style={{ width: '45%' }} />
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '20%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Service Name</th>
                          <th style={{ textAlign: 'right' }}>Monthly Cost</th>
                          <th style={{ textAlign: 'right' }}>Cost Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceData.services.map((s, idx) => (
                          <tr key={s.service_name} className={idx === 0 ? 'top-service' : ''}>
                            <td className="service-name" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.service_name}
                            </td>
                            <td className="service-cost" style={{ textAlign: 'right' }}>{fmt.format(s.cost)}</td>
                            <td className="service-percentage" style={{ textAlign: 'right' }}>{s.percentage.toFixed(1)}%</td>
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
    </>
  )
}