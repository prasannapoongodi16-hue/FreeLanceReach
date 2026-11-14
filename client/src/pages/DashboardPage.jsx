import { useCallback, useEffect, useState } from 'react'
import { Activity, BriefcaseBusiness, Check, CircleUserRound, MapPin, RefreshCw, UserRound } from 'lucide-react'
import api, { getApiError } from '../lib/api'
import { Link } from 'react-router-dom'

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date)
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState([])
  const [projectsCount, setProjectsCount] = useState(0)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState('')

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/summary')
      setDashboard(data?.dashboard || null)
    } catch (requestError) {
      setError(getApiError(requestError, 'We could not load your dashboard.'))
    } finally { setLoading(false) }
  }, [])

  const loadSummary = useCallback(() => {
    setLoading(true)
    setError('')
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    let active = true
    api.get('/dashboard/summary')
      .then(({ data }) => { if (active) setDashboard(data?.dashboard || null) })
      .catch((requestError) => { if (active) setError(getApiError(requestError, 'We could not load your dashboard.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    api.get('/leads', { params: { status: 'client_won', page: 1, limit: 4 } })
      .then(({ data }) => {
        if (!active) return
        setProjects(data?.leads || [])
        setProjectsCount(data?.pagination?.total || 0)
      })
      .catch((requestError) => {
        if (active) setProjectsError(getApiError(requestError, 'Could not load project details.'))
      })
      .finally(() => { if (active) setProjectsLoading(false) })
    return () => { active = false }
  }, [])

  const firstName = dashboard?.user?.name?.trim().split(/\s+/)[0] || 'there'

  return <div className="dashboard-page">
    <div className="welcome-row"><div><p className="eyebrow">YOUR WORKSPACE <span className="eyebrow-dot">✳</span></p><h1>Good to have you here, {firstName}.</h1><p className="welcome-copy">A calm place to get ready for your next client.</p></div><div className="welcome-date"><span className="date-dot" /> Your account is ready</div></div>
    {error && <div role="alert" className="dashboard-error"><span>{error}</span><button onClick={loadSummary}><RefreshCw size={15} /> Try again</button></div>}
    {loading ? <div className="dashboard-skeleton" aria-label="Loading dashboard"><div className="skeleton-line" /><div className="skeleton-block" /><div className="skeleton-block" /></div> : !dashboard ? <div className="empty-dashboard"><CircleUserRound size={32} /><h2>Dashboard details are unavailable</h2><p>We couldn’t load the summary for this account.</p><button className="button-primary" onClick={loadSummary}>Reload dashboard <RefreshCw size={15} /></button></div> : <>
      <section className="dashboard-grid">
        <article className="projects-card"><div className="projects-heading"><div><span className="card-kicker">DELIVERED WORK</span><h2>Projects undertaken</h2></div><span className="projects-count">{projectsLoading ? '—' : projectsCount}</span></div>{projectsLoading ? <div className="projects-loading" role="status"><span className="lead-spinner" />Loading projects…</div> : projectsError ? <p className="projects-empty" role="alert">{projectsError}</p> : projects.length ? <ul className="projects-list">{projects.map((project) => <li className="project-row" key={project._id}><span className="project-mark"><BriefcaseBusiness size={16} /></span><div className="project-info"><strong>{project.businessName}</strong><span>{project.category || 'Client project'}{project.location ? <><span className="project-separator"> · </span><span className="project-location"><MapPin size={12} />{project.location}</span></> : null}</span></div><span className="project-status">WON</span></li>)}</ul> : <div className="projects-empty"><strong>No projects listed yet</strong><span>Mark a lead as “Client won” and it will appear here.</span><Link viewTransition to="/leads">View leads <span aria-hidden="true">↗</span></Link></div>}{projectsCount > 4 && <Link viewTransition className="projects-more" to="/leads">View all {projectsCount} projects <span aria-hidden="true">→</span></Link>}</article>
        <article className="account-card"><div className="section-heading"><span className="account-icon"><UserRound size={19} /></span><div><span className="card-kicker">YOUR ACCOUNT</span><h2>Account details</h2></div></div><div className="account-data"><div><span className="data-label">Name</span><strong>{dashboard.user?.name || 'Not provided'}</strong></div><div><span className="data-label">Email</span><strong className="account-email">{dashboard.user?.email || 'Not provided'}</strong></div></div><div className="member-since"><span>Member since</span><strong>{formatDate(dashboard.account?.createdAt) || 'Date unavailable'}</strong></div></article>
      </section>
      <section className="account-strip"><span className="strip-icon"><Activity size={18} /></span><div><strong>Your workspace is set up.</strong><p>You joined on {formatDate(dashboard.account?.createdAt) || 'a date not available'}. Your account details are ready whenever you are.</p></div><span className="strip-check"><Check size={16} /></span></section>
    </>}
  </div>
}
