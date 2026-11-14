import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowUpRight, BarChart3, BriefcaseBusiness, ChevronDown, Compass, FileText, LayoutDashboard, LogOut, Menu, MessageCircle, Settings, X } from 'lucide-react'
import { useAuth } from '../context/useAuth'

const links = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', to: '/leads', icon: BriefcaseBusiness, group: 'WORKSPACE' },
  { label: 'Discovery', to: '/discovery', icon: Compass },
  { label: 'Website analysis', to: '/website-analysis', icon: BarChart3 },
  { label: 'Email drafts', to: '/email-drafts', icon: FileText, group: 'OUTREACH' },
  { label: 'Message composer', to: '/message-composer', icon: MessageCircle },
  { label: 'Gmail', to: '/gmail', icon: Activity },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const workspaceMenuRef = useRef(null)
  const title = links.find((item) => item.to === location.pathname)?.label || 'Settings'
  const initials = (user?.name || user?.email || 'F').trim().slice(0, 1).toUpperCase()

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    if (!workspaceMenuOpen) return undefined

    function closeOnOutsideClick(event) {
      if (!workspaceMenuRef.current?.contains(event.target)) setWorkspaceMenuOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setWorkspaceMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [workspaceMenuOpen])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } finally { navigate('/login', { replace: true, viewTransition: true }); setLoggingOut(false) }
  }

  function navItems(close = false) {
    let previousGroup = ''
    return links.map((item) => {
      const group = item.group && item.group !== previousGroup ? <p className="nav-group" key={`${item.group}-group`}>{item.group}</p> : null
      if (item.group) previousGroup = item.group
      const Icon = item.icon
      return <span className="nav-entry" key={item.to}>{group}<NavLink viewTransition to={item.to} onClick={() => close && setMobileOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span></NavLink></span>
    })
  }

  return <div className="workspace-shell">
    <aside className="sidebar">
      <NavLink viewTransition className="brand" to="/dashboard" aria-label="FreelanceReach home"><img src="/freelancereach-logo.jpg" alt="FreelanceReach — Connect freelancers with real clients" /></NavLink>
      <div className="workspace-menu-wrap" ref={workspaceMenuRef}>
        <button className={`workspace-switch${workspaceMenuOpen ? ' open' : ''}`} type="button" aria-expanded={workspaceMenuOpen} aria-controls="workspace-dropdown" onClick={() => setWorkspaceMenuOpen((open) => !open)}>
          <span className="workspace-avatar">{initials}</span><span className="workspace-label"><strong>{user?.name || 'My workspace'}</strong><small>Freelancer workspace</small></span><ChevronDown size={15} />
        </button>
        {workspaceMenuOpen && <div className="workspace-dropdown" id="workspace-dropdown" aria-label="Workspace actions">
          <div className="workspace-dropdown-heading"><span>Current workspace</span><strong>Freelancer workspace</strong></div>
          <NavLink viewTransition to="/settings" onClick={() => setWorkspaceMenuOpen(false)}><Settings size={16} /><span>Workspace settings</span></NavLink>
          <button type="button" onClick={() => { setWorkspaceMenuOpen(false); handleLogout() }} disabled={loggingOut}><LogOut size={16} /><span>{loggingOut ? 'Signing out…' : 'Sign out'}</span></button>
        </div>}
      </div>
      <nav className="side-nav" aria-label="Main navigation">{navItems()}</nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><span className="upgrade-icon"><ArrowUpRight size={17} /></span><strong>Your next step</strong><p>Complete your profile to make your workspace ready for what’s next.</p><NavLink viewTransition to="/dashboard">View profile <span>→</span></NavLink></div><NavLink viewTransition to="/settings" className={({ isActive }) => `nav-link settings-link${isActive ? ' active' : ''}`}><Settings size={18} /><span>Settings</span></NavLink><button className="sidebar-user" onClick={handleLogout} disabled={loggingOut}><span className="user-avatar">{initials}</span><span className="user-meta"><strong>{user?.name || 'Your account'}</strong><small>{user?.email || 'Signed in'}</small></span><LogOut size={16} aria-hidden="true" /></button></div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
    <aside className={`mobile-sidebar${mobileOpen ? ' open' : ''}`} aria-label="Mobile navigation"><div className="mobile-brand-row"><NavLink viewTransition className="brand" to="/dashboard" onClick={() => setMobileOpen(false)} aria-label="FreelanceReach home"><img src="/freelancereach-logo.jpg" alt="FreelanceReach — Connect freelancers with real clients" /></NavLink><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button></div><nav className="side-nav">{navItems(true)}<NavLink viewTransition to="/settings" onClick={() => setMobileOpen(false)} className="nav-link"><Settings size={18} /><span>Settings</span></NavLink></nav><button className="sidebar-user" onClick={handleLogout} disabled={loggingOut}><span className="user-avatar">{initials}</span><span className="user-meta"><strong>{user?.name || 'Your account'}</strong><small>Sign out</small></span><LogOut size={16} /></button></aside>
    <div className="main-column"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{title}</strong></div></div><div className="topbar-right"><span className="status-pill"><span />Workspace</span><span className="topbar-divider" /><span className="topbar-user-name">{user?.name || user?.email || 'Your account'}</span><span className="topbar-avatar">{initials}</span></div></header><main key={location.pathname} className="page-content page-enter" style={{ viewTransitionName: 'app-page' }}><Outlet /></main><footer className="page-footer"><span>FreelanceReach</span><span>Client acquisition, made focused.</span></footer></div>
  </div>
}
