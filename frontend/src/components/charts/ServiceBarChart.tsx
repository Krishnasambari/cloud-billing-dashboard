import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { ServiceCostItem } from '../../types/billing'

interface Props {
  services: ServiceCostItem[]
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
]

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function shortenServiceName(name: string): string {
  return name
    .replace(/^Amazon\s+/, '')
    .replace(/^AWS\s+/, '')
    .replace(/\s+\(.*?\)$/, '')
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ServiceCostItem
  const color = payload[0].fill as string
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl max-w-xs">
      <p className="text-xs text-slate-300 break-words mb-1">{d.service_name}</p>
      <p className="font-bold text-white">{fmt.format(d.cost)}</p>
      <p className="text-xs mt-0.5" style={{ color }}>{d.percentage.toFixed(1)}% of total</p>
    </div>
  )
}

export default function ServiceBarChart({ services }: Props) {
  // Top 12 services by cost, rest aggregated
  let chartData = [...services].slice(0, 12)

  return (
    <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 42)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis
          type="category"
          dataKey="service_name"
          width={130}
          tick={({ x, y, payload }) => (
            <text x={x} y={y} dy={4} textAnchor="end" fill="#94a3b8" fontSize={11}>
              {shortenServiceName(payload.value)}
            </text>
          )}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
          <LabelList
            dataKey="cost"
            position="right"
            formatter={(v: unknown) => fmt.format(Number(v))}
            style={{ fill: '#94a3b8', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
