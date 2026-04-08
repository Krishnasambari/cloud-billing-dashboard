export interface MonthlyCostItem {
  year: number
  month: number
  period_start: string
  period_end: string
  total_cost: number
  unit: string
  label: string
}

export interface MonthlyCostListResponse {
  data: MonthlyCostItem[]
  count: number
  currency: string
}

export interface ServiceCostItem {
  service_name: string
  cost: number
  unit: string
  percentage: number
}

export interface ServiceBreakdownResponse {
  year: number
  month: number
  label: string
  total_cost: number
  services: ServiceCostItem[]
  count: number
}

export interface SummaryMonthItem {
  label: string
  cost: number
  unit: string
}

export interface SummaryResponse {
  current_month: SummaryMonthItem
  last_month: SummaryMonthItem
  ytd: { year: number; cost: number; unit: string }
  mom_change_pct: number | null
}

export interface NoteItem {
  id: number
  year: number
  month: number
  service_name: string
  note: string
  note_date: string
  resource_id: string | null
  resource_name: string | null
  filter_name: string | null
  cloud: string
  cloud_account: string
  aws_profile: string
  created_at: string
}

export interface SyncStatusResponse {
  sync_id: number
  status: string
  started_at: string
  finished_at: string | null
  months_synced: number
  cloud: string
  cloud_account: string
  aws_profile: string | null
  aws_region: string | null
  error_message: string | null
}

export interface CloudAccount {
  cloud: string
  cloud_account: string
}
