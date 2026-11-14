import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, Clock3, ExternalLink, Gauge, RefreshCw, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import api, { getApiError } from '../lib/api'

const categories = [
  { key: 'performance', label: 'Performance', icon: Zap },
  { key: 'accessibility', label: 'Accessibility', icon: ShieldCheck },
  { key: 'bestPractices', label: 'Best practices', icon: CheckCircle2 },
  { key: 'seo', label: 'SEO', icon: Search },
]
const findingLabels = { performance: 'Performance', accessibility: 'Accessibility', 'best-practices': 'Best practices', seo: 'SEO' }
const progressMessages = ['Checking the public website address…', 'Launching the Lighthouse audit…', 'Reviewing page quality and accessibility…', 'Preparing scores and recommendations…']

function scoreTone(score) {
  if (score >= 0.9) return 'good'
  if (score >= 0.5) return 'mid'
  return 'low'
}

function ScoreCard({ category, score }) {
  const Icon = category.icon
  const available = typeof score === 'number' && Number.isFinite(score)
  const rounded = available ? Math.round(score * 100) : null
  return <article className={`analysis-score ${available ? scoreTone(score) : 'unavailable'}`}>
    <div className="analysis-score-top"><span><Icon size={16} /></span><small>{category.label}</small></div>
    <strong>{available ? rounded : '—'}{available && <em>/100</em>}</strong>
    <div className="analysis-score-track" aria-hidden="true"><span style={{ width: `${rounded ?? 0}%` }} /></div>
    <p>{available ? rounded >= 90 ? 'Strong result' : rounded >= 50 ? 'Room to improve' : 'Needs attention' : 'Score unavailable'}</p>
  </article>
}

function AnalysisFindings({ findings }) {
  if (!findings.length) return <div className="analysis-no-findings"><CheckCircle2 size={18} /><div><strong>No failed audits were returned</strong><p>Lighthouse did not report any failed checks in the available categories.</p></div></div>
  return <div className="analysis-findings">{findings.map((finding, index) => <article className="analysis-finding" key={`${finding.auditId || finding.title}-${index}`}>
    <span className="analysis-finding-mark"><AlertTriangle size={15} /></span><div className="analysis-finding-copy"><div className="analysis-finding-title"><strong>{finding.title || finding.auditId || 'Lighthouse finding'}</strong><span>{findingLabels[finding.category] || finding.category}</span></div>
      {finding.description && <p>{finding.description}</p>}{finding.displayValue && <small>{finding.displayValue}</small>}
    </div>{finding.auditId && <a href={`https://developer.chrome.com/docs/lighthouse/${finding.category === 'best-practices' ? 'best-practices' : finding.category}/${finding.auditId}/`} target="_blank" rel="noreferrer" aria-label={`Learn about ${finding.auditId}`}><ExternalLink size={14} /></a>}
  </article>)}</div>
}

export default function WebsiteAnalysisPage() {
  const [leads, setLeads] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [leadsError, setLeadsError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const selectedLead = leads.find((lead) => lead._id === selectedId)

  useEffect(() => {
    let active = true
    async function loadLeads() {
      setLoadingLeads(true); setLeadsError('')
      try {
        const response = await api.get('/leads', { params: { page: 1, limit: 50 } })
        if (!active) return
        const items = response.data.leads || []
        setLeads(items)
        setSelectedId((current) => {
          const nextId = items.some((lead) => lead._id === current) ? current : items[0]?._id || ''
          if (nextId !== current) { setAnalysis(null); setAnalysisError(null) }
          return nextId
        })
      } catch (error) { if (active) { setLeads([]); setLeadsError(getApiError(error, 'Could not load your leads.')) } }
      finally { if (active) setLoadingLeads(false) }
    }
    loadLeads()
    return () => { active = false }
  }, [refresh])

  useEffect(() => {
    if (!analyzing) return undefined
    const timer = window.setInterval(() => setProgressStep((step) => (step + 1) % progressMessages.length), 6500)
    return () => window.clearInterval(timer)
  }, [analyzing])

  async function runAnalysis() {
    if (!selectedLead || !selectedLead.website) return
    setAnalysisError(null); setAnalysis(null); setProgressStep(0); setAnalyzing(true)
    try {
      const response = await api.post(`/websites/${selectedLead._id}/analyze`, {}, { timeout: 110000 })
      const updatedLead = response.data.lead
      setLeads((items) => items.map((lead) => lead._id === updatedLead._id ? updatedLead : lead))
      setAnalysis(updatedLead.websiteAnalysis || null)
    } catch (error) {
      const status = error?.response?.status
      const message = error.code === 'ECONNABORTED'
        ? 'The request took too long to receive a response. The audit can take up to 90 seconds; try again.'
        : status === 504
          ? 'The Lighthouse audit reached its 90-second limit. Check that the site is available, then try again.'
          : status === 429
            ? getApiError(error, 'An analysis is already running or the three-audits-per-15-minute limit was reached. Wait a little, then retry.')
            : status === 502
              ? 'The site could not be reached or Lighthouse could not complete the audit. Check the URL and try again.'
              : getApiError(error, 'Website analysis failed. Please try again.')
      setAnalysisError(message)
    } finally { setAnalyzing(false) }
  }

  const currentAnalysis = analysis || selectedLead?.websiteAnalysis
  const findings = Array.isArray(currentAnalysis?.findings) ? currentAnalysis.findings : []
  const hasAnalysis = Boolean(currentAnalysis?.scores)

  return <section className="website-analysis-page">
    <div className="leads-heading analysis-heading"><div><p className="lead-kicker">REVIEW BEFORE OUTREACH</p><h1>Website analysis</h1><p>See how a prospect’s website performs across key Lighthouse categories.</p></div><span className="analysis-provider"><Gauge size={14} /> Lighthouse</span></div>

    {leadsError && <div className="analysis-alert" role="alert"><AlertTriangle size={17} /><div><strong>Could not load leads</strong><p>{leadsError}</p></div><button className="lead-button secondary" onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={14} /> Retry</button></div>}
    <div className="analysis-select-card"><div className="analysis-select-intro"><span className="discovery-search-icon"><BarChart3 size={18} /></span><div><strong>Choose a lead to analyze</strong><p>Only leads saved in your workspace are available.</p></div></div>
      <div className="analysis-select-row"><label className="lead-field">Lead<select aria-label="Choose a lead" value={selectedId} disabled={loadingLeads || !leads.length || analyzing} onChange={(event) => { setSelectedId(event.target.value); setAnalysis(null); setAnalysisError(null) }}><option value="">{loadingLeads ? 'Loading your leads…' : leads.length ? 'Select a lead' : 'No leads found'}</option>{leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.businessName}{lead.website ? '' : ' · no website'}</option>)}</select></label><button className="lead-button primary analysis-run" onClick={runAnalysis} disabled={!selectedLead?.website || analyzing || loadingLeads}><Sparkles size={15} />{analyzing ? 'Analyzing…' : hasAnalysis ? 'Run again' : 'Analyze website'}</button></div>
      {selectedLead && <div className="analysis-selected-detail"><span>{selectedLead.category || 'Business'}{selectedLead.location ? ` · ${selectedLead.location}` : ''}</span>{selectedLead.website ? <a href={selectedLead.website} target="_blank" rel="noreferrer">{selectedLead.website}<ExternalLink size={13} /></a> : <span className="analysis-missing-site"><AlertTriangle size={14} /> Add a website to this lead before running an analysis.</span>}</div>}
      {!loadingLeads && leads.length === 50 && <p className="analysis-limit-note">Showing the latest 50 leads. Use the Leads page to find or update another one.</p>}
    </div>

    {analyzing && <div className="analysis-progress" role="status" aria-live="polite"><div className="analysis-progress-icon"><span className="lead-spinner" /></div><div className="analysis-progress-content"><strong>Running Lighthouse analysis</strong><p>{progressMessages[progressStep]}</p><div className="analysis-progress-track"><span /></div><small>This can take up to 90 seconds. Keep this page open.</small></div></div>}
    {analysisError && <div className="analysis-alert analysis-alert-error" role="alert"><AlertTriangle size={17} /><div><strong>Analysis could not be completed</strong><p>{analysisError}</p></div><button className="lead-button secondary" onClick={runAnalysis} disabled={!selectedLead?.website || analyzing}><RefreshCw size={14} /> Retry</button></div>}

    {!loadingLeads && !leadsError && leads.length === 0 && <div className="lead-table-card lead-state lead-empty analysis-empty"><BriefcaseEmpty /><h2>Add a lead first</h2><p>Website analysis runs on a lead already saved in your workspace.</p><a className="lead-button primary" href="/leads">Go to Leads <ArrowUpRight size={15} /></a></div>}
    {selectedLead && !selectedLead.website && <div className="analysis-empty-site"><AlertTriangle size={18} /><div><strong>This lead doesn’t have a website yet</strong><p>Analysis uses the website captured when this lead was created or discovered. This business information is read-only.</p></div><a href="/discovery" className="lead-button secondary">Find businesses <ArrowUpRight size={14} /></a></div>}
    {hasAnalysis && <>
      <div className="analysis-results-head"><div><p className="lead-kicker">LATEST SAVED RESULT</p><h2>{selectedLead?.businessName}</h2><p>Audited {currentAnalysis.analyzedAt ? new Date(currentAnalysis.analyzedAt).toLocaleString() : 'date unavailable'}</p></div>{currentAnalysis.analyzedUrl && <a href={currentAnalysis.analyzedUrl} target="_blank" rel="noreferrer" className="analysis-audited-url">{currentAnalysis.analyzedUrl}<ExternalLink size={13} /></a>}</div>
      <div className="analysis-score-grid">{categories.map((category) => <ScoreCard key={category.key} category={category} score={currentAnalysis.scores?.[category.key]} />)}</div>
      <section className="analysis-findings-card"><div className="analysis-findings-heading"><div><p className="lead-kicker">LIGHTHOUSE AUDIT</p><h2>Findings & recommendations</h2></div><span>{findings.length} {findings.length === 1 ? 'finding' : 'findings'}</span></div><AnalysisFindings findings={findings} /></section>
    </>}
    {!hasAnalysis && !analyzing && selectedLead?.website && !analysisError && <div className="analysis-empty-state"><span><BarChart3 size={20} /></span><strong>Ready to check this website</strong><p>Run an audit to see the latest Lighthouse scores and failed checks for this lead.</p></div>}
    <p className="analysis-disclaimer"><Clock3 size={13} /> Each lead stores its latest analysis only. A separate analysis history endpoint is not available.</p>
  </section>
}

function BriefcaseEmpty() {
  return <span className="analysis-empty-icon"><BarChart3 size={22} /></span>
}
