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

export async function fetchResources(serviceName: string, profile?: string): Promise<ResourcesResponse> {
  const { data } = await client.get('/resources', {
    params: { service_name: serviceName, ...(profile ? { profile } : {}) },
  })
  return data
}
