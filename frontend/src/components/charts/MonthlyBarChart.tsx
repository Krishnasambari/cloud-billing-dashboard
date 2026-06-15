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
  '#6366f1', '#8b5cf6', '#06b6d4', '#3b82f6',
  '#10b981', '#f59e0b', '#ef4444', '#ec4899',
  '#84cc16', '#f97316', '#14b8a6', '#a855f7',
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
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{d.label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color }}>{fmt.format(d.total_cost)}</p>
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

  // Dynamically size bar width based on number of months
  const barSize = Math.max(18, Math.min(36, Math.floor(600 / (data.length || 1)) - 10));
  const sortedData = [...data].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart
        data={sortedData}
        margin={{ top: 12, right: 16, left: 8, bottom: 40 }}
        barCategoryGap="30%"
        style={{ cursor: 'pointer' }}
      >
        <CartesianGrid strokeDasharray="4 4" stroke="#F0F2F5" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#10182F', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={0}
          textAnchor="middle"
          height={55}
        />
        <YAxis
          tick={{ fill: '#10182F', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v) =>
            v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
          }
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
        />
        <Bar
          dataKey="total_cost"
          radius={[5, 5, 0, 0]}
          maxBarSize={barSize}
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
                opacity={hasSelection && !isSelected ? 0.25 : 1}
                stroke={isSelected ? '#ffffff' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
