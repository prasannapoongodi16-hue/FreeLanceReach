import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock3, FileText, Mail, Save, Send, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { getApiError } from '../lib/api'

const statuses = { draft: 'Draft', sending: 'Sending', sent: 'Sent', send_failed: 'Send failed' }
const isSample = (draft) => Boolean(draft?.isSample) || /\[sample(?: draft)?\]/i.test(`${draft?.subject || ''}\n${draft?.body || ''}`)
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()) && String(value).trim().length <= 254

function describeError(error, fallback) {
  if (error?.response?.status === 429) return 'Rate limit reached. Wait before trying again.'
  if (error?.response?.status === 400) return getApiError(error, 'Check the draft details and try again.')
  return getApiError(error, fallback)
}

export default function EmailDraftsPage() {
  const [leads, setLeads] = useState([])
  const [freelancerProfile, setFreelancerProfile] = useState(null)
  const [leadId, setLeadId] = useState('')
  const [drafts, setDrafts] = useState([])
  const [draft, setDraft] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [approval, setApproval] = useState(false)
  const [step, setStep] = useState(1)
  const [sendConfirmation, setSendConfirmation] = useState(null)
  const selectedLead = useMemo(() => leads.find((lead) => lead._id === leadId), [leads, leadId])
  const changed = draft && (subject !== draft.subject || body !== draft.body)
  const sample = isSample(draft)
  const recipient = selectedLead?.businessEmail?.trim() || ''
  const blocked = Boolean(selectedLead?.doNotContact || selectedLead?.leadStatus === 'do_not_contact')
  const sendable = draft?.status === 'draft' && !sample && !blocked && validEmail(recipient) && !changed

  useEffect(() => {
    let active = true
    api.get('/leads', { params: { page: 1, limit: 50 } }).then(({ data }) => {
      if (!active) return
      const items = data.leads || []
      setLeads(items)
      setLeadId(items[0]?._id || '')
    }).catch((err) => { if (active) setError(describeError(err, 'Could not load your leads.')) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    api.get('/profile').then(({ data }) => setFreelancerProfile(data.profile || null)).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    async function loadDrafts() {
      setDraft(null); setDrafts([]); setApproval(false); setNotice('')
      if (!leadId) return
      setDraftsLoading(true); setError('')
      try {
        const { data } = await api.get('/email-drafts', { params: { leadId } })
        if (!active) return
        const items = data.drafts || []
        setDrafts(items)
        if (items[0]) await selectDraft(items[0]._id, activeCheck)
      } catch (err) { if (active) setError(describeError(err, 'Could not load drafts.')) }
      finally { if (active) setDraftsLoading(false) }
    }
    const activeCheck = () => active
    loadDrafts()
    return () => { active = false }
  }, [leadId])

  async function selectDraft(id, isActive = () => true, openReview = false) {
    setError(''); setNotice(''); setApproval(false)
    try {
      const { data } = await api.get(`/email-drafts/${id}`)
      if (!isActive()) return
      setDraft(data.draft); setSubject(data.draft.subject); setBody(data.draft.body)
      if (openReview) setStep(2)
    } catch (err) { if (isActive()) setError(describeError(err, 'Could not retrieve this draft.')) }
  }

  async function refreshDrafts(selectId, openReview = false) {
    const { data } = await api.get('/email-drafts', { params: { leadId } })
    const items = data.drafts || []
    setDrafts(items)
    const target = selectId || items[0]?._id
    if (target) await selectDraft(target, () => true, openReview)
    else { setDraft(null); setSubject(''); setBody('') }
  }

  async function generate() {
    if (!selectedLead || blocked) return
    setBusy('generate'); setError(''); setNotice(''); setApproval(false)
    try {
      const { data } = await api.post('/email-drafts/generate', { leadId })
      await refreshDrafts(data.draft?._id, true)
      setNotice('Draft created. Review and edit it before use.')
    } catch (err) { setError(describeError(err, 'Could not generate a draft.')) }
    finally { setBusy('') }
  }

  async function save() {
    if (!draft || !changed) return
    if (!subject.trim() || subject.trim().length > 200 || !body.trim() || body.trim().length > 8000) {
      setError('Subject must be 1–200 characters and body 1–8,000 characters.'); return
    }
    setBusy('save'); setError(''); setNotice('')
    try {
      const safeSubject = sample && !/^\[sample(?: draft)?\]/i.test(subject.trim()) ? `[SAMPLE] ${subject.trim()}`.slice(0, 200) : subject.trim()
      const safeBody = sample && !/^\[sample(?: draft)?\]/i.test(body.trim()) ? `[SAMPLE DRAFT — NOT SENT]\n\n${body.trim()}`.slice(0, 8000) : body.trim()
      const { data } = await api.put(`/email-drafts/${draft._id}`, { subject: safeSubject, body: safeBody })
      setDraft(data.draft); setSubject(data.draft.subject); setBody(data.draft.body); setApproval(false); setNotice('Draft saved.')
      setDrafts((items) => items.map((item) => item._id === data.draft._id ? data.draft : item))
    } catch (err) { setError(describeError(err, 'Could not save this draft.')) }
    finally { setBusy('') }
  }

  async function removeDraft() {
    if (!draft || draft.status !== 'draft' || !window.confirm('Delete this draft? This cannot be undone.')) return
    setBusy('delete'); setError(''); setNotice('')
    try { await api.delete(`/email-drafts/${draft._id}`); await refreshDrafts(); setStep(1); setNotice('Draft deleted.') }
    catch (err) { setError(describeError(err, 'Could not delete this draft.')) }
    finally { setBusy('') }
  }

  async function sendApproved() {
    if (!sendable || !approval || busy) return
    setBusy('send'); setError(''); setNotice(''); setSendConfirmation(null)
    try {
      const { data } = await api.post(`/gmail/drafts/${draft._id}/send`, { approved: true })
      const sentAt = data.sentAt || new Date().toISOString()
      const sentDraft = { ...draft, status: 'sent', sentAt, gmailMessageId: data.gmailMessageId || draft.gmailMessageId }
      setDraft(sentDraft)
      setDrafts((items) => items.map((item) => item._id === sentDraft._id ? sentDraft : item))
      setApproval(false)
      setSendConfirmation({ recipient, subject, sentAt, message: data.message || 'Your email was sent successfully.' })
      setStep(3)
    } catch (err) { setError(describeError(err, 'Gmail could not send this approved draft.')) }
    finally { setBusy('') }
  }

  return <section className="email-drafts-page">
    <div className="leads-heading analysis-heading"><div><p className="lead-kicker">REVIEW BEFORE OUTREACH</p><h1>{step === 1 ? 'Email drafts' : step === 2 ? 'Review your draft' : 'Email sent'}</h1><p>{step === 1 ? 'Choose a lead and create or select a draft.' : step === 2 ? 'Edit the message and review every detail before sending.' : 'Your approved email has been sent.'}</p></div><span className="analysis-provider"><Sparkles size={14} /> Draft workspace</span></div>
    <ol className="email-stepper" aria-label="Email draft steps">
      <li className={step === 1 ? 'active' : 'complete'}><span>1</span><div><strong>Choose a lead</strong><small>Select a lead and draft</small></div></li>
      <li className={step === 2 ? 'active' : step === 3 ? 'complete' : ''}><span>2</span><div><strong>Review message</strong><small>Edit and approve</small></div></li>
      <li className={step === 3 ? 'active' : ''}><span>3</span><div><strong>Sent</strong><small>Delivery confirmed</small></div></li>
    </ol>
    <div className="email-sample-note"><AlertTriangle size={16} /><p><strong>Development sample mode.</strong> Sample output is clearly marked and can never be sent.</p></div>
    {error && <div className="analysis-alert analysis-alert-error" role="alert"><AlertTriangle size={17} /><div><strong>Action needs attention</strong><p>{error}</p></div></div>}
    {notice && <div className="email-notice" role="status"><Check size={16} />{notice}</div>}
    {step === 1 && <div className="analysis-select-card email-lead-picker"><div className="analysis-select-intro"><span className="discovery-search-icon"><Mail size={18} /></span><div><strong>Choose a lead</strong><p>Drafts are private to your account and belong to one lead.</p></div></div>
      <div className="analysis-select-row"><label className="lead-field">Lead<select value={leadId} disabled={loading || busy === 'generate'} onChange={(event) => setLeadId(event.target.value)}><option value="">{loading ? 'Loading your leads…' : leads.length ? 'Select a lead' : 'No leads found'}</option>{leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.businessName}{lead.doNotContact || lead.leadStatus === 'do_not_contact' ? ' · do not contact' : ''}</option>)}</select></label><button className="lead-button primary analysis-run" onClick={generate} disabled={!selectedLead || blocked || Boolean(busy) || loading}><Sparkles size={15} />{busy === 'generate' ? 'Generating…' : 'Generate draft'}</button></div>
      {selectedLead && <><div className="analysis-selected-detail"><span>{selectedLead.category || 'Business'}{selectedLead.location ? ` · ${selectedLead.location}` : ''}</span><span>{recipient || 'No recipient email saved'}{blocked ? ' · Do not contact' : ''}</span></div><div className="composer-personalization" aria-live="polite"><Sparkles size={14} /><div><strong>Personalized draft context</strong><div className="composer-context-chips"><span>{selectedLead.category || 'Shop type'}</span>{freelancerProfile?.name && <span>{freelancerProfile.name}</span>}{freelancerProfile?.jobCategories?.[0] && <span>{freelancerProfile.jobCategories[0].replaceAll('_', ' ')}</span>}{freelancerProfile?.services?.[0] && <span>{freelancerProfile.services[0]}</span>}{freelancerProfile?.profile?.portfolioUrl && <span>Portfolio link</span>}{selectedLead.websiteAnalysis?.findings?.length > 0 && <span>Website insight</span>}</div><small>New drafts use these available details to shape a specific, editable project idea.</small></div></div></>}
      {blocked && <p className="analysis-missing-site"><AlertTriangle size={14} /> Draft generation and sending are disabled for this do-not-contact lead.</p>}
      {!loading && leads.length === 50 && <p className="analysis-limit-note">Showing your latest 50 leads.</p>}
    </div>}
    {step === 1 && !loading && !leads.length && <div className="analysis-empty-state"><FileText size={20} /><div><strong>Add a lead first</strong><p>Email drafts can only be created for an existing lead.</p></div><Link viewTransition className="lead-button primary" to="/discovery">Go to Discovery</Link></div>}
    {step === 1 && selectedLead && <div className="email-workspace email-select-step">
      <section className="analysis-findings-card email-draft-list"><div className="analysis-findings-heading"><div><p className="lead-kicker">SAVED FOR THIS LEAD</p><h2>Your drafts</h2></div><span>{drafts.length} / 100</span></div>
        {draftsLoading ? <div className="lead-state"><span className="lead-spinner" />Loading drafts…</div> : !drafts.length ? <div className="email-list-empty"><FileText size={20} /><strong>No drafts yet</strong><p>Generate a first draft for this lead.</p></div> : <div className="email-draft-items">{drafts.map((item) => <button key={item._id} className={`email-draft-item${draft?._id === item._id ? ' selected' : ''}`} onClick={() => selectDraft(item._id, () => true, true)} disabled={Boolean(busy)}><span className="email-item-icon"><FileText size={15} /></span><span className="email-item-copy"><strong>{item.subject}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Date unavailable'}</small></span><span className={`email-status status-${item.status}`}>{statuses[item.status] || item.status}{isSample(item) ? ' · Sample' : ''}</span></button>)}</div>}
        <p className="analysis-disclaimer"><Clock3 size={13} /> Up to 100 drafts are returned, newest first. No separate regenerate route exists; Generate draft creates another draft.</p>
      </section>
    </div>}
    {step === 2 && draft && <div className="email-workspace email-review-step">
      <button className="email-back-button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back to lead and drafts</button>
      {draft && <section className="analysis-findings-card email-editor"><div className="analysis-findings-heading"><div><p className="lead-kicker">{draft.status === 'draft' ? 'EDITABLE DRAFT' : 'MESSAGE STATUS'}</p><h2>{draft.status === 'draft' ? 'Review your message' : 'Draft details'}</h2></div><span className={`email-status status-${draft.status}`}>{statuses[draft.status] || draft.status}</span></div>
        {sample && <div className="email-sample-banner"><AlertTriangle size={16} /><div><strong>Sample output · not for sending</strong><p>This draft is marked as mock output. Sending is disabled for sample content.</p></div></div>}
        <label className="lead-field email-field">Subject<input value={subject} maxLength={200} disabled={draft.status !== 'draft' || Boolean(busy)} onChange={(event) => { setSubject(event.target.value); setApproval(false) }} /></label><div className="email-char-count">{subject.length} / 200</div>
        <label className="lead-field email-field">Body<textarea value={body} maxLength={8000} rows={14} disabled={draft.status !== 'draft' || Boolean(busy)} onChange={(event) => { setBody(event.target.value); setApproval(false) }} /></label><div className="email-char-count">{body.length} / 8,000</div>
        {draft.status === 'draft' && <div className="email-actions"><button className="lead-button secondary" onClick={save} disabled={!changed || Boolean(busy)}><Save size={14} />{busy === 'save' ? 'Saving…' : 'Save changes'}</button><button className="lead-button secondary email-delete" onClick={removeDraft} disabled={Boolean(busy)}><Trash2 size={14} />Delete draft</button></div>}
        <div className="email-send-preview"><p className="lead-kicker">SEND REVIEW</p><h3>Recipient</h3><p className="email-recipient">{recipient || 'No recipient email saved'}</p><h3>Subject preview</h3><p className="email-preview-subject">{subject || 'No subject'}</p><h3>Full message preview</h3><pre>{body || 'No message body'}</pre>
          {draft.status === 'draft' && (blocked || !validEmail(recipient) || sample || changed) && <p className="email-send-block" role="status">{blocked ? 'Sending is blocked because this lead is marked do-not-contact.' : !validEmail(recipient) ? 'Add a valid recipient email to this lead before sending.' : sample ? 'Sample drafts cannot be sent.' : 'Save your edits before requesting send approval.'}</p>}
          {draft.status === 'draft' && <label className="email-approval"><input type="checkbox" checked={approval} disabled={!sendable || Boolean(busy)} onChange={(event) => setApproval(event.target.checked)} /><span>I reviewed the recipient, full subject, and message above, and approve sending this email.</span></label>}
          {draft.status === 'draft' && <button className="lead-button primary email-send-button" onClick={sendApproved} disabled={!sendable || !approval || Boolean(busy)}><Send size={14} />{busy === 'send' ? 'Sending…' : 'Send approved email'}</button>}
          {draft.status === 'sending' && <p className="email-send-block">A send is in progress. Do not retry; refresh the draft status shortly.</p>}
          {draft.status === 'sent' && <p className="email-sent-note"><Check size={15} /> Sent{draft.sentAt ? ` · ${new Date(draft.sentAt).toLocaleString()}` : ''}</p>}
        </div>
      </section>}
    </div>}
    {step === 3 && sendConfirmation && <section className="email-success-page" aria-labelledby="email-success-title" role="status">
      <span className="email-success-icon"><CheckCircle2 size={30} /></span>
      <p className="lead-kicker">SEND COMPLETE</p>
      <h2 id="email-success-title">Your email was sent</h2>
      <p className="email-success-copy">{sendConfirmation.message}</p>
      <dl className="email-success-details"><div><dt>Recipient</dt><dd>{sendConfirmation.recipient}</dd></div><div><dt>Subject</dt><dd>{sendConfirmation.subject}</dd></div><div><dt>Sent</dt><dd>{new Date(sendConfirmation.sentAt).toLocaleString()}</dd></div></dl>
      <div className="email-success-actions"><button className="lead-button secondary" onClick={() => setStep(2)}><Mail size={15} /> View sent message</button><button className="lead-button primary" onClick={() => { setStep(1); setSendConfirmation(null) }}>Back to email drafts</button></div>
    </section>}
  </section>
}
