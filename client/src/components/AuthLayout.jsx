import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AuthLayout({ children, title, subtitle, footer, alternate }) {
  return (
    <main className="auth-layout min-h-screen bg-[#f6f8fc] lg:grid lg:grid-cols-[1fr_1fr]">
      <section className="auth-aside relative hidden overflow-hidden bg-[#132b52] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 top-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-8 top-40 h-64 w-64 rounded-full border border-white/10" />
        <Link viewTransition to="/" className="auth-brand-logo relative" aria-label="FreelanceReach home"><img src="/freelancereach-logo.jpg" alt="FreelanceReach — Connect freelancers with real clients" /></Link>
        <div className="relative max-w-lg pb-10">
          <p className="mb-5 text-xs font-semibold tracking-[.22em] text-blue-200">YOUR NEXT OPPORTUNITY STARTS HERE</p>
          <h2 className="text-5xl font-semibold leading-[1.12] tracking-tight">Build a business that keeps moving.</h2>
          <p className="mt-6 max-w-md text-base leading-7 text-blue-100/75">Bring your client discovery and outreach into one focused workspace.</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-blue-100"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><ArrowUpRight size={17} /></span>Make room for your next great project</div>
        </div>
        <p className="relative text-xs text-blue-100/55">FreelanceReach · Client acquisition, made focused.</p>
      </section>
      <section className="auth-panel flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8"><p className="mb-2 text-sm font-semibold text-blue-700">Welcome to FreelanceReach</p><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p></div>
          {children}
          {footer && <p className="mt-7 text-center text-sm text-slate-500">{footer} <Link viewTransition className="font-semibold text-blue-700 hover:text-blue-800" to={alternate.to}>{alternate.label}</Link></p>}
        </div>
      </section>
    </main>
  )
}
