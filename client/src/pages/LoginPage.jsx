import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/useAuth'
import { getApiError } from '../lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email address.')
    if (!form.password) return setError('Enter your password.')
    setSubmitting(true)
    try {
      await login({ email: form.email.trim(), password: form.password })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to sign in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off." footer="New to FreelanceReach?" alternate={{ to: '/register', label: 'Create an account' }}>
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <label className="block text-sm font-medium text-slate-700">Email address<input autoComplete="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="you@example.com" /></label>
      <label className="block text-sm font-medium text-slate-700">Password<input autoComplete="current-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Your password" /></label>
      <button disabled={submitting} className="w-full rounded-xl bg-[#173b70] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102f5d] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className="mt-6 text-center text-xs leading-5 text-slate-400">By continuing, you agree to use FreelanceReach responsibly.</p>
    <Link viewTransition to="/register" className="sr-only">Create an account</Link>
  </AuthLayout>
}
