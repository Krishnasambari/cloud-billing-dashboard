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
}

export async function fetchResources(serviceName: string, profile?: string): Promise<ResourcesResponse> {
  const { data } = await client.get('/resources', {
    params: { service_name: serviceName, ...(profile ? { profile } : {}) },
  })
  return data
}

export async function fetchResourceStats(region: string, profile?: string): Promise<ResourceStats> {
  const { data } = await client.get('/resources/stats', {
    params: { region, ...(profile ? { profile } : {}) },
  })
  return data
}
