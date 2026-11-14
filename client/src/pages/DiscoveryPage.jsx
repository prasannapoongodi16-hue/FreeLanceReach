import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Clock3, ExternalLink, MapPin, Phone, Search, ShoppingBag, Sparkles, Star } from 'lucide-react'
import api, { getApiError } from '../lib/api'
import { jobCategoryGroups } from '../lib/jobCategories'
import GooglePlacesMap from '../components/GooglePlacesMap'

const businessCategories = [
  ['restaurant', 'Restaurants & cafes'], ['clothing', 'Clothing shops'], ['gym', 'Gyms & sports centres'],
  ['clinic', 'Clinics & doctors'], ['hotel', 'Hotels & guest houses'], ['real_estate', 'Real estate agents'],
  ['supermarket', 'Supermarkets'], ['bakery', 'Bakeries'], ['electronics', 'Electronics shops'], ['beauty', 'Beauty shops'],
]

function errorKind(error) {
  const status = error?.response?.status
  if (status === 429) return 'rate'
  if (status === 400) return 'validation'
  if (status >= 500 || !status) return 'provider'
  return 'general'
}

function DiscoveryError({ error, onRetry }) {
  if (!error) return null
  const kind = errorKind(error)
  const copy = kind === 'rate'
    ? 'Google Places is receiving requests too quickly. Wait a little, then try again.'
    : kind === 'provider'
      ? getApiError(error, 'Google Places is temporarily unavailable. Please try again shortly.')
      : getApiError(error, 'Could not search businesses.')
  return <div className="discovery-error" role="alert"><AlertTriangle size={17} /><div><strong>{kind === 'validation' ? 'Check your search details' : kind === 'rate' ? 'Please slow down' : kind === 'provider' ? 'Google Places unavailable' : 'Search failed'}</strong><p>{copy}</p></div>{onRetry && <button type="button" className="lead-button secondary" onClick={onRetry}>Try again</button>}</div>
}

function BusinessCard({ business, selected, imported, onToggle }) {
  const openingHours = Array.isArray(business.openingHours)
    ? business.openingHours
    : business.openingHours ? [business.openingHours] : []
  const hasDetails = business.location || business.businessPhone || business.website || openingHours.length || business.rating != null
  return <article className={`discovery-card${selected ? ' selected' : ''}`}>
    <label className="discovery-check"><input type="checkbox" checked={selected || imported} disabled={imported} onChange={() => onToggle(business.googlePlaceId)} aria-label={`Select ${business.businessName}`} />{imported && <span>In your leads</span>}</label>
    <div className="discovery-card-title"><span className="discovery-business-icon"><ShoppingBag size={17} /></span><div><h3>{business.businessName}</h3><p>{business.category || 'Business'}</p></div></div>
    <div className="discovery-details">
      {business.location && <span><MapPin size={14} />{business.location}</span>}
      {business.businessPhone && <a href={`tel:${business.businessPhone}`}><Phone size={14} />{business.businessPhone}</a>}
      {business.website && <a href={business.website} target="_blank" rel="noreferrer"><ExternalLink size={14} />Website</a>}
      {openingHours.map((hours) => <span key={hours}><Clock3 size={14} />{hours}</span>)}
      {business.rating != null && <span><Star size={14} />{business.rating}{business.userRatingCount ? ` · ${business.userRatingCount.toLocaleString()} reviews` : ''}</span>}
      {!hasDetails && <span className="discovery-muted">No additional details are available for this listing.</span>}
    </div>
    <small className="discovery-source"><strong>Google Maps</strong> · Place details</small>
  </article>
}

export default function DiscoveryPage() {
  const [city, setCity] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [businesses, setBusinesses] = useState([])
  const [selection, setSelection] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [importError, setImportError] = useState('')
  const [notice, setNotice] = useState('')
  const [importedIds, setImportedIds] = useState([])

  useEffect(() => {
    api.get('/leads', { params: { page: 1, limit: 50 } })
      .then(({ data }) => setImportedIds((data.leads || []).filter((lead) => lead.googlePlaceId).map((lead) => lead.googlePlaceId)))
      .catch(() => {})
  }, [])

  async function search(event) {
    event?.preventDefault()
    setSearchError(null); setImportError(''); setNotice(''); setSearched(true)
    if (city.trim().length < 2 || city.trim().length > 100) {
      setBusinesses([]); setSelection([])
      setSearchError({ response: { status: 400, data: { message: 'Enter a city or location between 2 and 100 characters.' } } })
      return
    }
    if (!businessCategory && !serviceCategory) {
      setBusinesses([]); setSelection([])
      setSearchError({ response: { status: 400, data: { message: 'Choose a business type, a service category, or both.' } } })
      return
    }
    setLoading(true); setBusinesses([]); setSelection([])
    try {
      const response = await api.post('/discovery/search', { city: city.trim(), businessCategory, serviceCategory, limit: 20 })
      setBusinesses(response.data.businesses || [])
    } catch (error) { setSearchError(error) }
    finally { setLoading(false) }
  }

  function toggle(id) { setSelection((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }

  async function importSelected() {
    const selectedPlaces = businesses.filter((business) => selection.includes(business.googlePlaceId))
    if (!selectedPlaces.length) return
    setImporting(true); setImportError(''); setNotice('')
    try {
      const response = await api.post('/leads/import-google-places', {
        city: city.trim(),
        places: selectedPlaces.map((place) => ({ googlePlaceId: place.googlePlaceId, category: place.searchCategory }))
      })
      const { summary = {}, duplicates = [], invalid = [] } = response.data
      const failedIds = new Set([...duplicates, ...invalid].map((item) => item.googlePlaceId))
      const addedIds = selectedPlaces.filter((item) => !failedIds.has(item.googlePlaceId)).map((item) => item.googlePlaceId)
      setImportedIds((current) => [...new Set([...current, ...addedIds, ...duplicates.map((item) => item.googlePlaceId)])])
      setSelection([])
      setNotice(`${summary.saved || 0} saved to Leads${summary.duplicates ? ` · ${summary.duplicates} already saved` : ''}${summary.invalid ? ` · ${summary.invalid} could not be saved` : ''}. Google business details load live when you open a lead.`)
    } catch (error) { setImportError(getApiError(error, 'Could not save the selected places.')) }
    finally { setImporting(false) }
  }

  const allSelectable = businesses.filter((item) => !importedIds.includes(item.googlePlaceId))
  return <section className="discovery-page">
    <div className="leads-heading discovery-heading"><div><p className="lead-kicker">FIND YOUR NEXT CLIENT</p><h1>Business discovery</h1><p>Search Google Maps for local businesses and review their available contact details.</p></div><span className="discovery-provider"><span /> Google Maps</span></div>
    <form className="discovery-search-card" onSubmit={search}>
      <div className="discovery-search-intro"><span className="discovery-search-icon"><Sparkles size={18} /></span><div><strong>Search a location</strong><p>Choose a place, then select a business type, a service category, or both.</p></div></div>
      <div className="discovery-fields"><label className="lead-field">City or location<input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} minLength={2} required placeholder="e.g. Pune, India" /></label><label className="lead-field">Business type<select value={businessCategory} onChange={(event) => setBusinessCategory(event.target.value)}><option value="">Any business type</option>{businessCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="lead-field">Service category<select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)}><option value="">Any service category</option>{jobCategoryGroups.map((group) => <optgroup label={group.label} key={group.label}>{group.categories.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</optgroup>)}</select></label><button className="lead-button primary discovery-submit" disabled={loading}><Search size={15} />{loading ? 'Searching…' : 'Search Google Maps'}</button></div>
      <p className="discovery-hint">Select either field or both. When both are selected, results include matches from either category. Google Places returns up to 20 matches, depending on coverage; API usage may be billed by Google.</p>
    </form>
    {searchError && <DiscoveryError error={searchError} onRetry={errorKind(searchError) === 'provider' || errorKind(searchError) === 'rate' ? search : null} />}
    {importError && <div className="discovery-error" role="alert"><AlertTriangle size={17} /><div><strong>Couldn’t save places</strong><p>{importError}</p></div></div>}
    {notice && <div className="lead-notice" role="status"><Check size={15} />{notice}<a href="/leads">View leads</a></div>}
    <div className="discovery-results-head"><div><h2>Search results</h2><p>{loading ? 'Contacting Google Places…' : searched && !searchError ? `${businesses.length} ${businesses.length === 1 ? 'business' : 'businesses'} found${businesses.length === 20 ? ' · showing the 20 result limit' : ''}` : 'Results will appear here after a search.'}</p></div>{businesses.length > 0 && <button type="button" className="lead-button secondary" onClick={() => setSelection(selection.length === allSelectable.length ? [] : allSelectable.map((item) => item.googlePlaceId))} disabled={loading || importing}>{selection.length === allSelectable.length ? 'Clear selection' : 'Select available'}</button>}</div>
    <GooglePlacesMap businesses={businesses} />
    {loading ? <div className="lead-table-card lead-state"><span className="lead-spinner" />Searching Google Maps…</div> : searched && !searchError && businesses.length === 0 ? <div className="lead-table-card lead-state lead-empty"><MapPin size={27} /><h2>No businesses found</h2><p>Try another nearby city or choose a different business type or service category.</p></div> : businesses.length > 0 && <><div className="discovery-grid">{businesses.map((business) => <BusinessCard key={business.googlePlaceId} business={business} selected={selection.includes(business.googlePlaceId)} imported={importedIds.includes(business.googlePlaceId)} onToggle={toggle} />)}</div><div className="discovery-import-bar"><span>{selection.length} selected</span><small>Only Google Place IDs and your selected category are saved. Business details are refreshed live.</small><button className="lead-button primary" disabled={!selection.length || importing} onClick={importSelected}>{importing ? 'Saving…' : `Add ${selection.length || ''} to Leads`}</button></div></>}
    <p className="discovery-attribution"><strong>Google Maps</strong> data · Contact information is shown only when Google provides it. Saved leads refresh details live.</p>
  </section>
}
