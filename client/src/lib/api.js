import axios from 'axios'

export const TOKEN_KEY = 'freelancereach_token'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, ''),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function getApiError(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) => item.message).join(' ')
  }
  return data?.message || error?.message || fallback
}

export default api
