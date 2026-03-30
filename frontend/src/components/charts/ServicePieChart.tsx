import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ServiceCostItem } from '../../types/billing'

interface Props {
  services: ServiceCostItem[]
  totalCost: number
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ServiceCostItem & { fill: string }
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl max-w-xs">
      <p className="text-xs text-slate-300 break-words">{d.service_name}</p>
      <p className="font-bold text-white">{fmt.format(d.cost)}</p>
      <p className="text-xs text-slate-400">{d.percentage.toFixed(1)}% of total</p>
    </div>
  )
}

export default function ServicePieChart({ services, totalCost }: Props) {
  // Aggregate small services into "Other" if more than 9
  let chartData = [...services]
  if (chartData.length > 9) {
    const top = chartData.slice(0, 8)
    const rest = chartData.slice(8)
    const otherCost = rest.reduce((s, r) => s + r.cost, 0)
    top.push({
      service_name: `Other (${rest.length} services)`,
      cost: otherCost,
      unit: 'USD',
      percentage: totalCost > 0 ? Math.round((otherCost / totalCost) * 1000) / 10 : 0,
    })
    chartData = top
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="cost"
          nameKey="service_name"
          cx="50%"
          cy="50%"
          outerRadius={110}
          innerRadius={55}
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-slate-300">{value}</span>
          )}
          iconSize={10}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
