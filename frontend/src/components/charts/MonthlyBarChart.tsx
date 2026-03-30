import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { MonthlyCostItem } from '../../types/billing'

interface Props {
  data: MonthlyCostItem[]
  selectedYear: number | null
  selectedMonth: number | null
  onMonthSelect: (year: number, month: number) => void
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
  '#0ea5e9', '#d946ef', '#22c55e', '#eab308',
  '#f43f5e', '#64748b', '#fb923c', '#a3e635',
  '#38bdf8', '#c084fc', '#4ade80', '#facc15',
]

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as MonthlyCostItem
  const color = payload[0].fill as string
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-white">{d.label}</p>
      <p className="font-bold" style={{ color }}>{fmt.format(d.total_cost)}</p>
    </div>
  )
}

export default function MonthlyBarChart({
  data,
  selectedYear,
  selectedMonth,
  onMonthSelect,
}: Props) {
  const hasSelection = selectedYear !== null && selectedMonth !== null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        style={{ cursor: 'pointer' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
        <Bar
          dataKey="total_cost"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
          onClick={(entry: any) => onMonthSelect(entry.year, entry.month)}
        >
          {data.map((entry, i) => {
            const isSelected =
              entry.year === selectedYear && entry.month === selectedMonth
            const color = COLORS[i % COLORS.length]
            return (
              <Cell
                key={`${entry.year}-${entry.month}`}
                fill={color}
                opacity={hasSelection && !isSelected ? 0.3 : 1}
                stroke={isSelected ? '#ffffff' : 'none'}
                strokeWidth={isSelected ? 1.5 : 0}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
