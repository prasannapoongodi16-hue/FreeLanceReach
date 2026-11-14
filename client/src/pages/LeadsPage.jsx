import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { getApiError } from '../lib/api'

const statuses = ['new', 'reviewed', 'ready_for_contact', 'contacted', 'replied', 'interested', 'negotiation', 'client_won', 'not_interested', 'no_response', 'invalid_contact', 'do_not_contact', 'closed_lost']
const label = (value = '') => value.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')

function LeadDetail({ lead, onClose, onDelete, onChange }) {
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const [places, setPlaces] = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placeDetails, setPlaceDetails] = useState(lead.liveGooglePlace || null)
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState(false)
  const [placesError, setPlacesError] = useState(lead.liveGooglePlaceError || '')
  const displayPhone = placeDetails?.phone || lead.businessPhone
  const displayWebsite = placeDetails?.websiteUri || lead.website
  const profileName = placeDetails?.displayName || lead.businessName
  const profileCategory = placeDetails?.primaryTypeDisplayName || lead.category
  const profileLocation = placeDetails?.formattedAddress || lead.location
  async function update(payload) { setBusy(true); try { const response = await api.put(`/leads/${lead._id}`, payload); onChange(response.data.lead) } catch (error) { window.alert(getApiError(error, 'Could not update this lead.')) } finally { setBusy(false) } }
  async function findGooglePlaces() {
    if (lead.googlePlaceId) {
      await loadGooglePlaceDetails(lead.googlePlaceId)
      return
    }
    setPlacesLoading(true); setPlacesError(''); setPlaces([]); setPlaceDetails(null)
    try {
      const response = await api.post(`/leads/${lead._id}/google-places/search`)
      setPlaces(response.data.places || [])
      if (!response.data.places?.length) setPlacesError('No matching places were found. Try checking the business name or location.')
    } catch (error) { setPlacesError(getApiError(error, 'Could not search Google Places.')) }
    finally { setPlacesLoading(false) }
  }
  async function loadGooglePlaceDetails(placeId) {
    setPlaceDetailsLoading(true); setPlacesError('')
    try {
      const response = await api.post(`/leads/${lead._id}/google-places/details`, { placeId })
      setPlaceDetails(response.data.place)
      setPlaces([])
      onChange({ ...lead, googlePlaceId: response.data.place.id })
    } catch (error) { setPlacesError(getApiError(error, 'Could not load Google Places details.')) }
    finally { setPlaceDetailsLoading(false) }
  }
  return <div className="lead-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="lead-dialog lead-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title"><div className="lead-dialog-head"><div><span className="lead-kicker">LEAD PROFILE</span><h2 id="lead-detail-title">{profileName}</h2><p>{[profileCategory, profileLocation].filter(Boolean).join(' · ') || 'No category or location added'}</p></div><button className="lead-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <div className="lead-detail-controls"><label>Status<select disabled={busy} value={lead.leadStatus} onChange={(event) => update({ leadStatus: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label><label>Priority<select disabled={busy} value={lead.priority} onChange={(event) => update({ priority: event.target.value })}>{['low', 'medium', 'high'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label><label className="lead-dnc"><input type="checkbox" disabled={busy} checked={Boolean(lead.doNotContact)} onChange={(event) => update({ doNotContact: event.target.checked })} /> Do not contact</label></div>
    <div className="lead-detail-wide lead-detail-lookup"><div><strong>Find more details with Google Places</strong><p>Choose the matching result. Phone, website, hours and rating appear here when available.</p></div><button className="lead-button secondary" disabled={placesLoading || placeDetailsLoading} onClick={findGooglePlaces}>{placesLoading ? 'Searching…' : placeDetailsLoading ? 'Loading details…' : lead.googlePlaceId ? 'Refresh Google details' : 'Search Google Places'} <Search size={13} /></button></div>
    <div className="lead-detail-grid"><div><span>Email · {placeDetails ? 'not provided by Google Places' : 'lead record'}</span><strong className={!lead.businessEmail ? 'lead-detail-missing' : ''}>{lead.businessEmail || 'Not listed'}</strong></div><div><span>Phone · {placeDetails?.phone ? 'Google Maps · live' : 'lead record'}</span>{displayPhone ? <a href={`tel:${displayPhone}`}>{displayPhone}{placeDetails?.phone && <small className="lead-live-tag">Live</small>}</a> : <strong className="lead-detail-missing">Not listed</strong>}</div><div><span>Website · {placeDetails?.websiteUri ? 'Google Maps · live' : 'lead record'}</span>{displayWebsite ? <a href={displayWebsite} target="_blank" rel="noreferrer">Visit website <ExternalLink size={13} />{placeDetails?.websiteUri && <small className="lead-live-tag">Live</small>}</a> : <strong className="lead-detail-missing">Not listed</strong>}</div><div><span>Source · read only</span><strong>{lead.discoverySource === 'google_places' ? 'Google Maps · live' : lead.discoverySource === 'openstreetmap' ? 'Previously saved' : 'Manual'}</strong></div>{placeDetails && <p className="lead-detail-wide lead-live-note">Google phone and website are live details; they aren’t saved to the lead.</p>}{(placeDetails?.openingHours?.length || placeDetails?.rating != null || lead.openingHours || lead.cuisine || lead.brand || lead.operator) ? <div className="lead-detail-wide"><span>Additional business details</span><p>{[placeDetails?.openingHours?.length && `Hours: ${placeDetails.openingHours.join('; ')}`, placeDetails?.rating != null && `Rating: ${placeDetails.rating}${placeDetails.userRatingCount ? ` (${placeDetails.userRatingCount.toLocaleString()} reviews)` : ''}`, lead.openingHours && `Saved hours: ${lead.openingHours}`, lead.cuisine && `Cuisine: ${lead.cuisine.replaceAll(';', ', ')}`, lead.brand && `Brand: ${lead.brand}`, lead.operator && `Operator: ${lead.operator}`].filter(Boolean).join(' · ')}</p></div> : <div className="lead-detail-wide"><span>Additional business details</span><p className="lead-detail-missing">No other details are available.</p></div>}{lead.businessDescription && <div className="lead-detail-wide"><span>Saved business description</span><p>{lead.businessDescription}</p></div>}
      {placesError && <p className="lead-detail-wide lead-place-error" role="alert">{placesError}</p>}
      {places.length > 0 && <div className="lead-detail-wide lead-place-results"><span>Google Maps results · choose the correct business</span>{places.map((place) => <article key={place.id}><div><strong>{place.displayName}</strong><p>{place.formattedAddress || 'Address not provided'}</p></div><button className="lead-button secondary" disabled={placeDetailsLoading} onClick={() => loadGooglePlaceDetails(place.id)}>Show details</button></article>)}</div>}
      {placeDetails && <div className="lead-detail-wide lead-place-card"><div className="lead-place-card-head"><div><span>GOOGLE MAPS DETAILS</span><h3>{placeDetails.displayName}</h3><p>{placeDetails.primaryTypeDisplayName}{placeDetails.primaryTypeDisplayName && placeDetails.formattedAddress ? ' · ' : ''}{placeDetails.formattedAddress}</p></div>{placeDetails.googleMapsUri && <a href={placeDetails.googleMapsUri} target="_blank" rel="noreferrer">Google Maps <ExternalLink size={13} /></a>}</div><div className="lead-place-facts">{placeDetails.rating != null && <div><span>Rating</span><strong>★ {placeDetails.rating}{placeDetails.userRatingCount ? ` · ${placeDetails.userRatingCount.toLocaleString()} reviews` : ''}</strong></div>}{placeDetails.openingHours?.length > 0 && <div className="lead-place-hours"><span>Opening hours</span><p>{placeDetails.openingHours.join(' · ')}</p></div>}</div><small>Live details provided by Google Maps. Only the place ID is saved to this lead.</small></div>}
      <div className="lead-detail-wide"><label className="lead-field">Your notes<textarea rows="3" maxLength={2000} value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} /></label><button className="lead-button secondary" disabled={busy || notes === (lead.notes || '')} onClick={() => update({ notes })}>Save notes</button></div></div>
    <div className="lead-form-actions"><button className="lead-button danger-outline" onClick={onDelete}><Trash2 size={15} /> Delete</button><button className="lead-button secondary" onClick={onClose}>Close</button></div></section></div>
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 })
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', category: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { page, limit: 10, includeGoogleSummaries: true }
      Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params[key] = value.trim() })
      const response = await api.get('/leads', { params })
      setLeads(response.data.leads || [])
      setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0, limit: 10 })
      const totalPages = response.data.pagination?.totalPages || 1
      if (page > totalPages) setPage(totalPages)
    } catch (requestError) { setError(getApiError(requestError, 'Could not load leads.')); setLeads([]) }
    finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer) }, [load, refreshKey])
  function changeFilter(key, value) { setPage(1); setFilters((current) => ({ ...current, [key]: value })) }
  async function showDetail(id) { setSelectedLeadId(id); setDetail({ loading: true }); try { const response = await api.get(`/leads/${id}`); setDetail(response.data.lead) } catch (requestError) { setDetail(null); setError(getApiError(requestError, 'Could not load lead details.')) } }
  async function deleteLead(lead) { if (!window.confirm(`Delete “${lead.businessName}”? This cannot be undone.`)) return; try { await api.delete(`/leads/${lead._id}`); setDetail(null); setNotice('Lead deleted.'); setRefreshKey((value) => value + 1) } catch (requestError) { setError(getApiError(requestError, 'Could not delete this lead.')) } }

  return <section className="leads-page"><div className="leads-heading"><div><p className="lead-kicker">YOUR PIPELINE</p><h1>Leads</h1><p>Google place names and contact details load live. Google Places requests may be billed.</p></div><Link viewTransition className="lead-button primary" to="/discovery"><Plus size={16} /> Find leads</Link></div>
    {notice && <div className="lead-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
    <div className="lead-toolbar"><label className="lead-search"><Search size={16} /><input aria-label="Search leads" maxLength={100} placeholder="Search business, category, or location" value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} /></label><input className="lead-filter-category" maxLength={80} aria-label="Filter by category" placeholder="Category" value={filters.category} onChange={(event) => changeFilter('category', event.target.value)} /><select aria-label="Filter by status" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><select aria-label="Filter by priority" value={filters.priority} onChange={(event) => changeFilter('priority', event.target.value)}><option value="">All priorities</option>{['low', 'medium', 'high'].map((value) => <option key={value} value={value}>{label(value)} priority</option>)}</select></div>
    {error && <div className="lead-error" role="alert"><span>{error}</span><button className="lead-button secondary" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={14} /> Retry</button></div>}
    <div className="lead-table-card"><div className="lead-table-top"><strong>{pagination.total} {pagination.total === 1 ? 'lead' : 'leads'}</strong><span>Most recently added first</span></div>{loading ? <div className="lead-state"><span className="lead-spinner" />Loading leads…</div> : leads.length === 0 ? <div className="lead-state lead-empty"><BriefcaseBusiness size={27} /><h2>{Object.values(filters).some(Boolean) ? 'No matching leads' : 'Your lead list is ready'}</h2><p>{Object.values(filters).some(Boolean) ? 'Try changing or clearing your filters.' : 'Discover prospects and save the ones you want to contact.'}</p>{Object.values(filters).some(Boolean) ? <button className="lead-button secondary" onClick={() => { setFilters({ search: '', status: '', priority: '', category: '' }); setPage(1) }}>Clear filters</button> : <Link viewTransition className="lead-button primary" to="/discovery"><Plus size={15} /> Discover prospects</Link>}</div> : <div className="lead-table-scroll"><table className="lead-table"><thead><tr><th>Business</th><th>Status</th><th>Priority</th><th>Contact</th><th>Added</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{leads.map((lead) => <tr className={selectedLeadId === lead._id ? 'selected' : undefined} key={lead._id}><td><button className="lead-business" onClick={() => showDetail(lead._id)}>{lead.liveGooglePlaceSummary?.displayName || lead.businessName}</button><span className="lead-subline">{lead.liveGooglePlaceSummary?.primaryTypeDisplayName || lead.category || 'Uncategorized'}{(lead.liveGooglePlaceSummary?.formattedAddress || lead.location) && ` · ${lead.liveGooglePlaceSummary?.formattedAddress || lead.location}`}</span></td><td><span className={`lead-status status-${lead.leadStatus}`}>{label(lead.leadStatus)}</span></td><td><span className={`lead-priority priority-${lead.priority}`}>{label(lead.priority)}</span></td><td><span className="lead-contact">{lead.businessEmail || lead.businessPhone || '—'}</span>{lead.doNotContact && <span className="lead-dnc-badge">Do not contact</span>}</td><td className="lead-date">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}</td><td><button className="lead-icon-button" aria-label={`View ${lead.liveGooglePlaceSummary?.displayName || lead.businessName}`} onClick={() => showDetail(lead._id)}><ChevronRight size={17} /></button></td></tr>)}</tbody></table></div>}
      {!loading && pagination.totalPages > 1 && <div className="lead-pagination"><span>Page {pagination.page} of {pagination.totalPages}</span><div><button className="lead-icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={17} /></button><button className="lead-icon-button" aria-label="Next page" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={17} /></button></div></div>}</div>
    {detail?.loading && <div className="lead-overlay"><section className="lead-dialog lead-state"><span className="lead-spinner" />Loading lead…</section></div>}{detail && !detail.loading && <LeadDetail key={detail._id} lead={detail} onClose={() => setDetail(null)} onDelete={() => deleteLead(detail)} onChange={(lead) => { setDetail(lead); setLeads((current) => current.map((item) => item._id === lead._id ? { ...item, ...lead, liveGooglePlaceSummary: item.liveGooglePlaceSummary } : item)) }} />}
  </section>
}
