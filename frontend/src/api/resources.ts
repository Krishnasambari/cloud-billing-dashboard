import client from './client'

export interface ResourceItem {
  id: string
  name: string
  detail: string
}

export interface ResourcesResponse {
  service_name: string
  resources: ResourceItem[]
  count: number
  supported: boolean
}

export interface ResourceStats {
  region: string
  EC2: { Total: number; Running: number; Stopped: number }
  ElasticIP: { Total: number; Attached: number; NotAttached: number }
  Volumes: { Total: number; InUse: number; Available: number }
  Snapshots: { Total: number }
  AMIs: { Total: number }
  S3: { TotalBuckets: number }
  LoadBalancers: { Total: number }
  // Azure stats
  VirtualMachines?: number
  StorageAccounts?: number
  SQLDatabases?: number
  AppServices?: number
  subscription_id?: string
}

export async function fetchResources(
  serviceName: string,
  cloud = 'aws',
  cloudAccount = '',
): Promise<ResourcesResponse> {
  const { data } = await client.get('/resources', {
    params: { service_name: serviceName, cloud, cloud_account: cloudAccount },
  })
  return data
}

export async function fetchResourceStats(
  region: string,
  cloud = 'aws',
  cloudAccount = '',
): Promise<ResourceStats> {
  const { data } = await client.get('/resources/stats', {
    params: { region, cloud, cloud_account: cloudAccount },
  })
  return data
}

export interface ServiceDetailResponse {
  service_name: string
  columns: string[]
  rows: Record<string, string>[]
  count: number
}

export interface S3BucketLens {
  name: string
  created: string
  actual_bytes: number | null
  lens_bytes: number | null
  actual_size: string
  lens_size: string
  warning: string | null
  is_new: boolean
}

export interface S3LensConfig {
  id: string
  is_enabled: boolean
  home_region: string | null
  cw_publishing: boolean
}

export interface S3StorageLensResponse {
  buckets: S3BucketLens[]
  bucket_count: number
  storage_lens_configs: S3LensConfig[]
  storage_lens_enabled: boolean
  lens_cw_publishing: boolean
  has_cw_data: boolean
  has_lens_metrics: boolean
  total_actual_bytes: number
  total_lens_bytes: number
  total_actual_size: string
  total_lens_size: string
  warnings_count: number
}

export async function fetchS3StorageLens(cloudAccount?: string): Promise<S3StorageLensResponse> {
  const { data } = await client.get('/resources/s3-lens', {
    params: cloudAccount ? { cloud_account: cloudAccount } : {},
  })
  return data
}

export async function fetchServiceDetail(
  serviceName: string,
  region: string,
  cloud = 'aws',
  cloudAccount = '',
): Promise<ServiceDetailResponse> {
  const { data } = await client.get('/resources/detail', {
    params: { service_name: serviceName, region, cloud, cloud_account: cloudAccount },
  })
  return data
}
