const fmtINR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const fmtUSD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

interface Props {
  title: string
  amount: number
  exchangeRate: number
  subtitle?: string
  trend?: number | null
  highlight?: boolean
  icon?: string
  isPercent?: boolean
  percentValue?: string
  // MoM diff — dollar difference to show below percent
  diffAmount?: number | null
  // Forecast badge text
  forecastBadge?: string
  forecastBadgeColor?: 'red' | 'green' | 'amber'
}

export default function CostCard({
  title,
  amount,
  exchangeRate,
  subtitle,
  trend,
  highlight,
  icon,
  isPercent,
  percentValue,
  diffAmount,
  forecastBadge,
  forecastBadgeColor = 'amber',
}: Props) {
  const isPositiveTrend = trend !== null && trend !== undefined && trend > 0
  const isNegativeTrend = trend !== null && trend !== undefined && trend < 0
  const hasTrend = trend !== null && trend !== undefined

  const inr = fmtINR.format(amount * exchangeRate)
  const usd = fmtUSD.format(amount)

  // Diff amount display (for MoM card)
  const hasDiff = diffAmount !== null && diffAmount !== undefined
  const diffIsPositive = hasDiff && diffAmount! > 0   // cost went UP   → red
  const diffIsNegative = hasDiff && diffAmount! < 0   // cost went DOWN → green
  const diffSign = diffIsPositive ? '+' : ''
  const diffUSD = hasDiff ? `${diffSign}${fmtUSD.format(diffAmount!)}` : null
  const diffINR = hasDiff ? `${diffSign}${fmtINR.format(diffAmount! * exchangeRate)}` : null

  const badgeColor =
    forecastBadgeColor === 'red'   ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    forecastBadgeColor === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                     'bg-amber-500/10 text-amber-400 border-amber-500/20'

  return (
    <div
      className={`relative rounded-xl p-5 flex flex-col gap-3 overflow-hidden transition-all ${
        highlight
          ? 'bg-gradient-to-br from-blue-600/20 to-blue-500/5 border border-blue-500/25'
          : 'bg-slate-900/70 border border-slate-800 hover:border-slate-700'
      }`}
    >
      {highlight && (
        <div className="absolute inset-0 bg-blue-500/5 rounded-xl pointer-events-none" />
      )}

      {/* Title row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          {title}
        </span>
        {icon && <span className="text-base">{icon}</span>}
      </div>

      {/* Value */}
      <div className="flex flex-col gap-1">
        {isPercent ? (
          <>
            <span className={`text-2xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-slate-100'}`}>
              {percentValue ?? '—'}
            </span>
            {/* Dollar difference below percent */}
            {hasDiff && diffUSD && (
              <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-semibold ${diffIsNegative ? 'text-emerald-400' : diffIsPositive ? 'text-red-400' : 'text-slate-400'}`}>
                  {diffINR}
                </span>
                <span className={`text-xs ${diffIsNegative ? 'text-emerald-500/70' : diffIsPositive ? 'text-red-500/70' : 'text-slate-500'}`}>
                  {diffUSD}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <span className={`text-2xl font-bold tracking-tight leading-none ${highlight ? 'text-white' : 'text-slate-100'}`}>
              {inr}
            </span>
            <span className="text-xs text-slate-500 font-normal">{usd}</span>
          </>
        )}
        {subtitle && (
          <span className="text-xs text-slate-500">{subtitle}</span>
        )}
      </div>

      {/* Forecast badge */}
      {forecastBadge && (
        <div className={`flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 w-fit border ${badgeColor}`}>
          {forecastBadge}
        </div>
      )}

      {/* Trend pill */}
      {hasTrend && (
        <div className={`flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 w-fit ${
          isNegativeTrend
            ? 'bg-emerald-500/10 text-emerald-400'
            : isPositiveTrend
              ? 'bg-red-500/10 text-red-400'
              : 'bg-slate-700/50 text-slate-400'
        }`}>
          {isNegativeTrend ? '▼' : isPositiveTrend ? '▲' : null}
          {' '}{Math.abs(trend!).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  )
}
