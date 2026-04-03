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

  const showChart = can(cards, 'chart_monthly')
  const showService = can(cards, 'chart_service')

  return (
    <>
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=Space+Grotesk:wght@300..700&display=swap');

  /* ========== PREMIUM DASHBOARD STYLES - FRESH GREEN & MODERN COLORS ========== */
  
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  /* Premium Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes softGlow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2);
    }
    50% {
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Dashboard Container - Fresh Gradient */
  .dashboard-container {
    margin: 0 auto;
    padding: 32px 28px;
    background: linear-gradient(135deg, #F5FDF8 0%, #F0F9F4 30%, #FEF7E8 70%, #F5FDF8 100%);
    min-height: 100vh;
    position: relative;
  }

  /* Subtle Nature-Inspired Background Pattern */
  .dashboard-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    animation: fadeInScale 0.8s ease-out;
  }

  /* Premium Error Banner - Soft Green */
  .error-banner {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0.02));
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 20px;
    padding: 14px 24px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    gap: 12px;
    backdrop-filter: blur(8px);
    animation: fadeInUp 0.4s ease-out;
  }

  .error-icon {
    width: 20px;
    height: 20px;
    color: #EF4444;
    flex-shrink: 0;
  }

  .error-text {
    color: #DC2626;
    font-size: 13px;
    font-weight: 500;
  }

  /* Stats Grid - Fresh Card Layout */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
    animation: fadeInUp 0.5s ease-out;
  
  }

  @media (min-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  /* Premium Card Component - Fresh Colors */
  .premium-card {
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    border: 1px solid rgba(16, 185, 129, 0.15);
    padding: 20px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: fadeInScale 0.5s ease-out forwards;
    opacity: 0;
    animation-fill-mode: forwards;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }

  .premium-card:hover {
    transform: translateY(-3px);
    border-color: rgba(16, 185, 129, 0.35);
    box-shadow: 0 12px 28px rgba(16, 185, 129, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02);
    background: rgba(255, 255, 255, 0.96);
  }

  /* Card Shimmer Effect - Fresh */
  .premium-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.04), transparent);
    transition: left 0.5s;
  }

  .premium-card:hover::before {
    left: 100%;
  }

  /* Card Variants - Fresh Color Palette */
  .card-primary {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(240, 253, 244, 0.88));
    border-left: 3px solid #10B981;
  }

  .card-success {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(220, 252, 231, 0.88));
    border-left: 3px solid #059669;
  }

  .card-warning {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(254, 243, 199, 0.88));
    border-left: 3px solid #F59E0B;
  }

  .card-info {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(207, 250, 254, 0.88));
    border-left: 3px solid #06B6D4;
  }

  .card-trend {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(233, 213, 255, 0.88));
    border-left: 3px solid #8B5CF6;
  }

  .card-forecast {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(254, 226, 226, 0.88));
    border-left: 3px solid #F97316;
  }

  .card-ytd {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(191, 219, 254, 0.88));
    border-left: 3px solid #3B82F6;
  }

  .card-neutral {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 249, 0.88));
    border-left: 3px solid #64748B;
  }

  /* Card Content */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .card-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #6B7280;
  }

  .card-icon {
    font-size: 28px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
    transition: transform 0.2s ease;
  }

  .premium-card:hover .card-icon {
    transform: scale(1.05);
  }

  .card-amount {
    font-size: 32px;
    font-weight: 700;
    color: #1F2937;
    margin: 10px 0 6px;
    font-family: 'Space Grotesk', monospace;
    letter-spacing: -0.5px;
  }

  .card-subtitle {
    font-size: 11px;
    color: #9CA3AF;
    margin-top: 4px;
  }

  .card-trend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    margin-top: 10px;
  }

  .trend-up {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
  }

  .trend-down {
    background: rgba(239, 68, 68, 0.08);
    color: #DC2626;
  }

  /* Chart Cards - Fresh Glassmorphism */
  .chart-card {
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(10px);
    border-radius: 28px;
    border: 1px solid rgba(16, 185, 129, 0.12);
    overflow: hidden;
    margin-bottom: 32px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeInUp 0.6s ease-out;
    position: relative;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  }

  .chart-card::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.03), transparent);
    pointer-events: none;
  }

  .chart-card:hover {
    transform: translateY(-3px);
    border-color: rgba(16, 185, 129, 0.25);
    box-shadow: 0 12px 32px rgba(16, 185, 129, 0.06);
    background: rgba(255, 255, 255, 0.94);
  }

  .chart-header {
    padding: 22px 28px;
    border-bottom: 1px solid rgba(16, 185, 129, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }

  .chart-title-section {
    flex: 1;
  }

  .chart-title {
    font-size: 18px;
    font-weight: 700;
    color: #1F2937;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: -0.3px;
  }

  .chart-title svg {
    color: #10B981;
  }

  .chart-subtitle {
    font-size: 12px;
    color: #9CA3AF;
    margin-top: 6px;
    font-weight: 500;
  }

  .clear-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.2);
    padding: 8px 18px;
    border-radius: 40px;
    color: #10B981;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-button:hover {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.35);
    transform: scale(1.01);
  }

  .chart-content {
    padding: 24px;
  }

  /* Loading States - Fresh */
  .loading-container {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(16, 185, 129, 0.15);
    border-top-color: #10B981;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    color: #9CA3AF;
    font-size: 13px;
    font-weight: 500;
  }

  /* Empty State */
  .empty-container {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    opacity: 0.4;
    color: #10B981;
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: #6B7280;
  }

  .empty-description {
    font-size: 12px;
    color: #9CA3AF;
    text-align: center;
    max-width: 300px;
  }

  /* Service Breakdown - Fresh Colors */
  .service-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    padding: 5px 14px;
    border-radius: 40px;
    font-size: 12px;
    font-weight: 500;
    color: #10B981;
  }

  .service-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
  }

  .service-stats {
    display: flex;
    gap: 20px;
    align-items: baseline;
  }

  .service-count {
    font-size: 13px;
    color: #6B7280;
    font-weight: 500;
  }

  .service-total {
    font-size: 16px;
    font-weight: 700;
    color: #F59E0B;
  }

  /* Table Styles - Clean Fresh Design */
  .table-container {
    border-top: 1px solid rgba(16, 185, 129, 0.1);
    padding-top: 20px;
    margin-top: 20px;
  }

  .table-title {
    font-size: 11px;
    font-weight: 700;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
    padding: 0 8px;
  }

  .data-table {
    width: 100%;
    font-size: 13px;
  }

  .data-table thead tr {
    border-bottom: 1px solid rgba(16, 185, 129, 0.12);
  }

  .data-table th {
    text-align: left;
    padding: 12px 12px;
    color: #6B7280;
    font-weight: 600;
    font-size: 12px;
  }

  .data-table th:last-child,
  .data-table td:last-child {
    text-align: right;
    padding-right: 12px;
  }

  .data-table td {
    padding: 12px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;
    color: #374151;
  }

  .data-table tbody tr {
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .data-table tbody tr:hover {
    background: rgba(16, 185, 129, 0.03);
  }

  .service-name {
    font-weight: 600;
    color: #1F2937;
  }

  .service-cost {
    font-family: 'Space Grotesk', monospace;
    font-weight: 600;
    color: #F59E0B;
  }

  .service-percentage {
    color: #9CA3AF;
    font-weight: 500;
  }

  /* Top Service Row */
  .top-service {
    background: rgba(16, 185, 129, 0.02);
  }
  
  .top-service .service-name {
    color: #1F2937;
    font-weight: 700;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dashboard-container {
      padding: 20px 16px;
    }
    
    .stats-grid {
      gap: 12px;
    }
    
    .chart-header {
      padding: 16px 20px;
      flex-direction: column;
      align-items: flex-start;
    }
    
    .service-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .data-table {
      font-size: 11px;
    }
    
    .data-table th,
    .data-table td {
      padding: 10px 8px;
    }
    
    .chart-title {
      font-size: 16px;
    }
    
    .card-amount {
      font-size: 24px;
    }
  }

  /* Chart Customization Overrides - Fresh Colors */
  .recharts-cartesian-grid-horizontal line,
  .recharts-cartesian-grid-vertical line {
    stroke: rgba(16, 185, 129, 0.1);
    stroke-dasharray: 3 3;
  }
  
  .recharts-text {
    fill: #9CA3AF;
    font-size: 11px;
    font-weight: 500;
  }
  
  .recharts-tooltip-wrapper {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.06));
  }
  
  .recharts-default-tooltip {
    background: rgba(255, 255, 255, 0.98) !important;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(16, 185, 129, 0.2) !important;
    border-radius: 16px !important;
    padding: 12px 16px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04) !important;
  }
  
  .recharts-tooltip-label {
    color: #1F2937 !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    margin-bottom: 8px !important;
  }
  
  .recharts-legend-item-text {
    color: #6B7280 !important;
    font-size: 11px !important;
    font-weight: 500 !important;
  }
  
  /* Custom Scrollbar - Fresh */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(16, 185, 129, 0.05);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(16, 185, 129, 0.3);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(16, 185, 129, 0.5);
  }

  /* Additional Fresh Elements */
  .stat-card {
    background: rgba(255, 255, 255, 0.88);
    border-radius: 20px;
    padding: 16px;
    border: 1px solid rgba(16, 185, 129, 0.1);
    transition: all 0.2s ease;
  }
  
  .stat-card:hover {
    background: rgba(255, 255, 255, 0.96);
    border-color: rgba(16, 185, 129, 0.25);
    transform: translateY(-2px);
  }
  
  .feature-badge {
    background: rgba(16, 185, 129, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.12);
    border-radius: 12px;
    padding: 8px 12px;
    transition: all 0.2s ease;
  }
  
  .feature-badge:hover {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
  }

  /* Fresh Accent Colors for Different Elements */
  .accent-green {
    color: #10B981;
  }
  
  .accent-emerald {
    color: #059669;
  }
  
  .accent-teal {
    color: #14B8A6;
  }
  
  .accent-blue {
    color: #3B82F6;
  }
  
  .accent-purple {
    color: #8B5CF6;
  }
  
  .accent-amber {
    color: #F59E0B;
  }
`}</style>

      <div className="dashboard-container">
        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="error-text">{error} — Click Sync from AWS to load data.</span>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (() => {
          const diff = summary.current_month.cost - summary.last_month.cost
          const forecast = calcForecast(summary.current_month.cost, summary.current_month.label)
          const projectedDiff = forecast ? forecast.projected - summary.last_month.cost : null

          return (
            <div className="stats-grid">
  {can(cards, 'summary_this_month') && (
    <CostCard
      title={<span className="font-bold text-sm text-white">This Month</span>}
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
      title={<span className="font-bold text-sm text-white">Last Month</span>}
      amount={summary.last_month.cost}
      exchangeRate={exchangeRate}
      subtitle={summary.last_month.label}
      icon="🗓️"
      variant="neutral"
    />
  )}

  {can(cards, 'summary_ytd') && (
    <CostCard
      title={<span className="font-bold text-sm text-white">Year to Date</span>}
      amount={summary.ytd.cost}
      exchangeRate={exchangeRate}
      subtitle={String(summary.ytd.year)}
      icon="📊"
      variant="ytd"
    />
  )}

  {can(cards, 'summary_mom') && (
    <CostCard
      title={<span className="font-bold text-sm text-white">MoM Change</span>}
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
      title={<span className="font-bold text-sm text-white">Forecast (Month End)</span>}
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
</div>
          )
        })()}

        {/* Monthly Bar Chart */}
        {showChart && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title-section">
                <div className="chart-title">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 13h4l3-7 4 10 3-6 4 3" />
                  </svg>
                  Monthly Spend Analysis
                </div>
                <p className="chart-subtitle">
                  {selectedYear && selectedMonth
                    ? '✨ Click the same bar again to deselect'
                    : '✨ Click any bar to drill into service details'}
                </p>
              </div>
              {selectedYear && selectedMonth && (
                <button
                  onClick={() => { setSelectedYear(null); setSelectedMonth(null) }}
                  className="clear-button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Selection
                </button>
              )}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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

        {/* Service Breakdown */}
        {showService && selectedYear && selectedMonth && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title-section">
                <div className="chart-title">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" />
                    <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
                  </svg>
                  Service Cost Breakdown
                </div>
                {serviceData && (
                  <div className="service-header">
                    <span className="service-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {serviceData.label ?? `${selectedYear}/${String(selectedMonth).padStart(2, '0')}`}
                    </span>
                    <div className="service-stats">
                      <span className="service-count">{serviceData.count} active services</span>
                      <span className="service-total">Total {fmt.format(serviceData.total_cost)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="chart-content">
              {servicesLoading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <span className="loading-text">Loading service data...</span>
                </div>
              ) : servicesError ? (
                <div className="error-banner" style={{ marginBottom: 0 }}>
                  <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="error-text">{servicesError}</span>
                </div>
              ) : serviceData ? (
                <div className="space-y-6">
                  <ServiceBarChart services={serviceData.services} />
                  
                  <div className="table-container">
                    <div className="table-title">Detailed Service Breakdown</div>
                    <table className="data-table">
                      <colgroup>
                        <col className="w-[55%]" />
                        <col className="w-[25%]" />
                        <col className="w-[20%]" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Service Name</th>
                          <th className="text-right">Monthly Cost</th>
                          <th className="text-right">Cost Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceData.services.map((s, i) => (
                          <tr key={s.service_name} className={i === 0 ? 'top-service' : ''}>
                            <td className="service-name truncate">{s.service_name}</td>
                            <td className="service-cost text-right">{fmt.format(s.cost)}</td>
                            <td className="service-percentage text-right">{s.percentage.toFixed(1)}%</td>
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