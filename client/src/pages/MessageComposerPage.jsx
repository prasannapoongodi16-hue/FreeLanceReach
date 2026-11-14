import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ExternalLink, MessageCircle, Search, Smartphone, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { getApiError } from '../lib/api'

const readableCategory = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const businessIdeas = [
  [/restaurant|cafe|coffee|bakery|food/i, 'make the menu, ordering options, or booking details easier for customers to find'],
  [/clinic|doctor|medical|dental|health/i, 'make services and appointment information easier for patients to navigate'],
  [/clothing|fashion|boutique|retail|shop|store/i, 'make product discovery and new-arrival promotions clearer online'],
  [/hotel|guest house|lodging|resort/i, 'make room details and enquiry or booking steps easier to understand'],
  [/gym|fitness|yoga|sports/i, 'make class information and membership options easier to explore'],
  [/beauty|salon|spa|barber/i, 'showcase services and make appointment enquiries simpler'],
  [/real estate|property/i, 'present listings and enquiry details more clearly']
]
const businessIdeaFor = (category) => businessIdeas.find(([pattern]) => pattern.test(category || ''))?.[1]
  || 'make the business’s services and next steps clearer for potential customers'

const defaultMessage = (businessName, freelancer = {}, category = '') => {
  const profile = freelancer.profile || {}
  const profession = readableCategory(freelancer.jobCategories?.[0])
  const service = freelancer.services?.[0] || freelancer.skills?.[0]
  const introduction = profession
    ? `${freelancer.name ? `I’m ${freelancer.name}, a freelance` : 'I’m a freelance'} ${profession}${service ? ` offering ${service}` : ''}.`
    : `I’m ${freelancer.name || 'a freelance professional'}${service ? `, and I offer ${service}` : ''}.`
  return [
    `Hello ${businessName},`,
    '',
    introduction,
    profile.introduction?.trim(),
    profile.experience?.trim() ? `My experience includes ${profile.experience.trim()}.` : '',
    `For ${businessName}, I could help ${businessIdeaFor(category)}.`,
    profile.portfolioUrl?.trim() ? `Portfolio: ${profile.portfolioUrl.trim()}` : '',
    '',
    'Would it be useful if I sent over two or three tailored ideas? No pressure either way.'
  ].filter(Boolean).join('\n').slice(0, 1000)
}

export default function MessageComposerPage() {
  const [leads, setLeads] = useState([])
  const [freelancer, setFreelancer] = useState(null)
  const [leadId, setLeadId] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [message, setMessage] = useState('')
  const [googlePhone, setGooglePhone] = useState('')
  const [googleBusinessName, setGoogleBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleError, setGoogleError] = useState('')
  const googleRequestId = useRef(0)

  useEffect(() => {
    let active = true
    api.get('/leads', { params: { page: 1, limit: 50 } })
      .then(({ data }) => {
        if (active) setLeads(data.leads || [])
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'Could not load your leads.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const selectedLead = useMemo(() => leads.find((lead) => lead._id === leadId), [leads, leadId])
  const selectedLeadRef = useRef(selectedLead)
  selectedLeadRef.current = selectedLead

  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => {
        const profile = data.profile || null
        setFreelancer(profile)
        const lead = selectedLeadRef.current
        if (lead) {
          setMessage((current) => current === defaultMessage(lead.businessName, {}, lead.category)
            ? defaultMessage(lead.businessName, profile || {}, lead.category)
            : current)
        }
      })
      .catch(() => {})
  }, [])
  const displayName = googleBusinessName || (selectedLead?.discoverySource === 'google_places' ? '' : selectedLead?.businessName) || ''
  const currentIdea = selectedLead ? businessIdeaFor(selectedLead.category) : ''
  const selectedService = freelancer?.services?.[0] || freelancer?.skills?.[0] || readableCategory(freelancer?.jobCategories?.[0])
  const phone = googlePhone || selectedLead?.businessPhone || ''
  const phoneForSms = phone.trim().replace(/[^\d+]/g, '')
  const phoneForWhatsApp = phone.trim().startsWith('+')
    ? phone.replace(/\D/g, '')
    : phone.trim().startsWith('00')
      ? phone.replace(/\D/g, '').slice(2)
      : ''
  const messageText = message.trim()
  const whatsappUrl = phoneForWhatsApp && messageText
    ? `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(messageText)}`
    : ''
  const smsUrl = phoneForSms && messageText
    ? `sms:${phoneForSms}?body=${encodeURIComponent(messageText)}`
    : ''

  function chooseLead(id) {
    googleRequestId.current += 1
    setLeadId(id)
    setGooglePhone('')
    setGoogleBusinessName('')
    setGoogleError('')
    setGoogleLoading(false)
    const lead = leads.find((item) => item._id === id)
    setMessage(lead ? defaultMessage(lead.businessName, freelancer || {}, lead.category) : '')
    if (lead?.googlePlaceId) {
      const requestId = googleRequestId.current
      fetchGoogleDetails(lead, requestId)
    }
  }

  async function fetchGoogleDetails(lead = selectedLead, requestId = ++googleRequestId.current) {
    if (!lead?.googlePlaceId) return
    setGoogleLoading(true)
    setGoogleError('')
    try {
      const { data } = await api.post(`/leads/${lead._id}/google-places/details`, {
        placeId: lead.googlePlaceId
      })
      if (requestId !== googleRequestId.current) return
      if (data.place?.phone) setGooglePhone(data.place.phone)
      else setGoogleError('Google Places did not return a phone number for this business.')
      if (data.place?.displayName) {
        setGoogleBusinessName(data.place.displayName)
        setMessage((current) => current === defaultMessage('Google Maps place', freelancer || {}, lead.category)
          ? defaultMessage(data.place.displayName, freelancer || {}, lead.category)
          : current)
      }
    } catch (requestError) {
      if (requestId === googleRequestId.current) {
        setGoogleError(getApiError(requestError, 'Could not fetch Google Places contact details.'))
      }
    } finally {
      if (requestId === googleRequestId.current) setGoogleLoading(false)
    }
  }

  return <section className="message-composer-page">
    <div className="leads-heading analysis-heading">
      <div><p className="lead-kicker">DIRECT OUTREACH</p><h1>Message composer</h1><p>Write a message for a lead and open it in WhatsApp or your SMS app.</p></div>
      <span className="analysis-provider"><MessageCircle size={14} /> WhatsApp · SMS</span>
    </div>

    {error && <div className="analysis-alert analysis-alert-error" role="alert"><AlertTriangle size={17} /><div><strong>Could not load leads</strong><p>{error}</p></div></div>}
    {loading ? <div className="lead-table-card lead-state"><span className="lead-spinner" />Loading leads…</div> : !leads.length ? <div className="analysis-empty-state"><MessageCircle size={20} /><div><strong>Add a lead first</strong><p>Message composer works with a saved lead and phone number.</p></div><Link viewTransition className="lead-button primary" to="/discovery">Go to Discovery</Link></div> : <div className="message-composer-grid">
      <section className="analysis-select-card message-editor-card">
        <div className="analysis-select-intro"><span className="discovery-search-icon"><MessageCircle size={18} /></span><div><strong>Compose a message</strong><p>Choose a lead, select a channel, and edit your draft.</p></div></div>
        <label className="lead-field message-lead-select">Lead<select value={leadId} onChange={(event) => chooseLead(event.target.value)}><option value="">Choose a lead</option>{leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.businessName}{lead.businessPhone ? ` · ${lead.businessPhone}` : lead.googlePlaceId ? ' · Google number available' : ' · no phone listed'}</option>)}</select></label>

        {selectedLead && <div className="message-contact-card"><div><span>TO</span><strong>{displayName || 'Google Maps place'}</strong><small>{[selectedLead.category, selectedLead.location].filter(Boolean).join(' · ')}</small></div><div className="message-contact-number"><span>PHONE</span><strong>{phone || 'No number loaded'}</strong>{googlePhone && <small>Google Places · live</small>}</div></div>}

        {selectedLead && <div className="composer-personalization" aria-live="polite"><Sparkles size={14} /><div><strong>Tailored for {displayName || 'this shop'}</strong><p>Current idea: {currentIdea}{selectedService ? `, using your ${selectedService} experience` : ''}.</p><div className="composer-context-chips">{selectedLead.category && <span>{selectedLead.category}</span>}{freelancer?.name && <span>{freelancer.name}</span>}{selectedService && <span>{selectedService}</span>}{freelancer?.profile?.portfolioUrl && <span>Portfolio link</span>}</div><small>The draft below updates as you edit. Check that the idea fits before opening WhatsApp or SMS.</small></div></div>}

        {selectedLead && selectedLead.googlePlaceId && (googleError || !phone) && !googleLoading && <div className="message-google-fetch"><span>There’s a saved Google Places match for this lead.</span><button type="button" className="lead-button secondary" onClick={() => fetchGoogleDetails()}><Search size={14} />{googleError ? 'Try Google again' : 'Get Google phone number'}</button></div>}
        {googleError && <p className="message-inline-error" role="alert">{googleError}</p>}
        {selectedLead && !phone && !selectedLead.googlePlaceId && <p className="message-help">No phone is saved for this lead. <Link viewTransition to="/leads">Open Leads</Link> and use Google Places to look for one.</p>}

        <div className="message-channel-picker" role="group" aria-label="Choose message channel"><button type="button" className={channel === 'whatsapp' ? 'active' : ''} aria-pressed={channel === 'whatsapp'} onClick={() => setChannel('whatsapp')}><MessageCircle size={15} /> WhatsApp</button><button type="button" className={channel === 'sms' ? 'active' : ''} aria-pressed={channel === 'sms'} onClick={() => setChannel('sms')}><Smartphone size={15} /> SMS / mobile message</button></div>

        <label className="lead-field message-body-field">Message<textarea rows="8" maxLength={1000} value={message} disabled={!selectedLead} onChange={(event) => setMessage(event.target.value)} placeholder="Write your message…" /></label>
        <div className="message-char-count">{message.length} / 1,000</div>
        <p className="message-send-note">Your message won’t send automatically. The selected app opens with your draft so you can review and send it.</p>
      </section>

      <section className="analysis-findings-card message-preview-card">
        <div className="analysis-findings-heading"><div><p className="lead-kicker">REVIEW BEFORE OPENING</p><h2>Message preview</h2></div><span>{channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span></div>
        {!selectedLead ? <div className="email-list-empty"><MessageCircle size={20} /><strong>Choose a lead</strong><p>Your message preview will appear here.</p></div> : <>
          <div className="message-preview-to"><span>RECIPIENT</span><strong>{displayName || 'Google Maps place'}</strong><p>{phone || 'No phone number available'}</p></div>
          <pre className="message-preview-text">{messageText || 'Write a message to see a preview.'}</pre>
          {channel === 'whatsapp' && phone && !phoneForWhatsApp && <p className="message-help">WhatsApp needs an international number with a country code, such as +91. Switch to SMS or use a lead number saved in international format.</p>}
          <div className="message-open-action">{channel === 'whatsapp' ? <a className="lead-button primary" href={whatsappUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!whatsappUrl} onClick={(event) => { if (!whatsappUrl) event.preventDefault() }}><MessageCircle size={15} /> Open WhatsApp <ExternalLink size={13} /></a> : <a className="lead-button primary" href={smsUrl || undefined} aria-disabled={!smsUrl} onClick={(event) => { if (!smsUrl) event.preventDefault() }}><Smartphone size={15} /> Open SMS app <ExternalLink size={13} /></a>}</div>
        </>}
      </section>
    </div>}
  </section>
}
