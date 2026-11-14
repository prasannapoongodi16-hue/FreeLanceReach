import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/useAuth'
import { getApiError } from '../lib/api'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (form.name.trim().length < 2 || form.name.trim().length > 80) return setError('Your name must contain 2–80 characters.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address.')
    if (form.password.length < 8 || form.password.length > 72) return setError('Your password must contain 8–72 characters.')
    setSubmitting(true)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to create your account. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthLayout title="Create your account" subtitle="Get started with a workspace built for your next client." footer="Already have an account?" alternate={{ to: '/login', label: 'Sign in' }}>
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <label className="block text-sm font-medium text-slate-700">Full name<input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Your name" /></label>
      <label className="block text-sm font-medium text-slate-700">Email address<input autoComplete="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="you@example.com" /></label>
      <label className="block text-sm font-medium text-slate-700">Password<input autoComplete="new-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="At least 8 characters" /><span className="mt-1 block text-xs font-normal text-slate-400">Use 8–72 characters.</span></label>
      <button disabled={submitting} className="w-full rounded-xl bg-[#173b70] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102f5d] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Creating account…' : 'Create account'}</button>
    </form>
  </AuthLayout>
}
