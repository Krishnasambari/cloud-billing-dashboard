import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('billing_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('billing_token')
      localStorage.removeItem('billing_user')
      window.location.href = '/'
    }
    const message =
      err.response?.data?.detail ?? err.message ?? 'Unknown error'
    return Promise.reject(new Error(message))
  }
)

export default client
