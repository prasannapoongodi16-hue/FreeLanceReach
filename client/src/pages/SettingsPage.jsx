import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Check, CircleUserRound, Mail, Save, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api, { getApiError } from '../lib/api'
import { jobCategories, jobCategoryGroups } from '../lib/jobCategories'

const allJobCategoryValues = jobCategories.map(({ value }) => value)
const categoryValue = (value) => jobCategories.find((category) => category.label === value)?.value || value
const emptyProfile = { name: '', email: '', profile: { introduction: '', experience: '', portfolioUrl: '' }, jobCategories: [], createdAt: '' }

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    api.get('/profile')
      .then(({ data }) => { if (active) setProfile({ ...emptyProfile, ...data.profile, profile: { ...emptyProfile.profile, ...data.profile?.profile }, jobCategories: Array.isArray(data.profile?.jobCategories) ? data.profile.jobCategories.map(categoryValue) : [] }) })
      .catch((requestError) => { if (active) setError(getApiError(requestError, 'Could not load your account settings.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function updateField(field, value) {
    setNotice('')
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function updateProfileField(field, value) {
    setNotice('')
    setProfile((current) => ({ ...current, profile: { ...current.profile, [field]: value } }))
  }

  function toggleJobCategory(category) {
    setNotice('')
    setProfile((current) => ({
      ...current,
      jobCategories: current.jobCategories.includes(category)
        ? current.jobCategories.filter((item) => item !== category)
        : [...current.jobCategories, category],
    }))
  }

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (profile.name.trim().length < 2 || profile.name.trim().length > 80) {
      setError('Name must contain 2–80 characters.')
      return
    }
    const portfolioUrl = profile.profile.portfolioUrl.trim()
    if (portfolioUrl && !/^https?:\/\/.+/i.test(portfolioUrl)) {
      setError('Portfolio URL must start with http:// or https://.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: profile.name.trim(),
        profile: {
          introduction: profile.profile.introduction.trim(),
          experience: profile.profile.experience.trim(),
          portfolioUrl,
        },
        jobCategories: profile.jobCategories,
      }
      const { data } = await api.put('/profile', payload)
      const saved = { ...profile, ...data.profile, profile: { ...profile.profile, ...data.profile?.profile }, jobCategories: data.profile?.jobCategories || profile.jobCategories }
      setProfile(saved)
      updateUser({ name: saved.name, email: saved.email })
      setNotice(data.message || 'Profile settings saved.')
    } catch (requestError) {
      setError(getApiError(requestError, 'Could not save your profile settings.'))
    } finally {
      setSaving(false)
    }
  }

  const memberSince = profile.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(profile.createdAt)) : null

  return <section className="settings-page" aria-labelledby="settings-title">
    <header className="leads-heading settings-heading">
      <div><p className="lead-kicker">PREFERENCES & ACCOUNT</p><h1 id="settings-title">Settings</h1><p>Manage your freelancer profile and workspace connections.</p></div>
      <span className="settings-heading-icon"><Settings2 size={19} /> Account settings</span>
    </header>

    {error && <div className="settings-alert settings-alert-error" role="alert"><AlertTriangle size={17} /><span>{error}</span></div>}
    {notice && <div className="settings-alert settings-alert-success" role="status"><Check size={16} /><span>{notice}</span></div>}

    {loading ? <div className="settings-loading" role="status"><span className="lead-spinner" />Loading your settings…</div> : <div className="settings-layout">
      <div className="settings-main-column">
        <form className="settings-card" onSubmit={saveProfile}>
          <div className="settings-card-heading"><span className="settings-card-icon"><CircleUserRound size={19} /></span><div><h2>Freelancer profile</h2><p>These details help personalize your workspace and outreach.</p></div></div>
          <div className="settings-form-grid">
            <label className="settings-field"><span>Full name</span><input autoComplete="name" maxLength={80} value={profile.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
            <label className="settings-field"><span>Email address</span><input type="email" value={profile.email || user?.email || ''} readOnly aria-describedby="settings-email-help" /><small id="settings-email-help">Your sign-in email cannot be changed here.</small></label>
            <label className="settings-field settings-field-wide"><span>Short introduction</span><textarea maxLength={500} rows={3} value={profile.profile.introduction} onChange={(event) => updateProfileField('introduction', event.target.value)} placeholder="What kind of work do you do?" /><small>{profile.profile.introduction.length}/500 characters</small></label>
            <fieldset className="settings-category-fieldset settings-field-wide">
              <legend>Job categories</legend>
              <p>Choose the kinds of work you offer. Select all that apply.</p>
              <div className="settings-category-groups">{jobCategoryGroups.map((group) => <section className="settings-category-group" key={group.label} aria-label={group.label}>
                <h3>{group.label}</h3>
                <div className="settings-category-options">{group.categories.map((category) => {
                  const selected = profile.jobCategories.includes(category.value)
                  return <label className={`job-category-option${selected ? ' selected' : ''}`} key={category.value}>
                    <input type="checkbox" checked={selected} onChange={() => toggleJobCategory(category.value)} />
                    <span>{category.label}</span>
                    {selected && <Check size={14} aria-hidden="true" />}
                  </label>
                })}</div>
              </section>)}</div>
              {profile.jobCategories.some((category) => !allJobCategoryValues.includes(category)) && <p className="settings-category-custom">Other saved categories: {profile.jobCategories.filter((category) => !allJobCategoryValues.includes(category)).join(', ')}</p>}
              <small>{profile.jobCategories.length} selected</small>
            </fieldset>
            <label className="settings-field"><span>Years of experience</span><input inputMode="numeric" maxLength={100} value={profile.profile.experience} onChange={(event) => updateProfileField('experience', event.target.value)} placeholder="e.g. 5 years" /></label>
            <label className="settings-field"><span>Portfolio website</span><input type="url" maxLength={300} value={profile.profile.portfolioUrl} onChange={(event) => updateProfileField('portfolioUrl', event.target.value)} placeholder="https://example.com" /></label>
          </div>
          <footer className="settings-form-footer"><span>Changes apply to your freelancer profile.</span><button className="lead-button primary" type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save changes'}</button></footer>
        </form>

        <section className="settings-card settings-connection-card" aria-labelledby="settings-connections-title">
          <div className="settings-card-heading"><span className="settings-card-icon"><Mail size={19} /></span><div><h2 id="settings-connections-title">Connected services</h2><p>Manage the accounts linked to FreelanceReach.</p></div></div>
          <div className="settings-service-row"><span className="settings-service-mark"><Mail size={17} /></span><div className="settings-service-copy"><strong>Gmail</strong><span>Use Gmail for sending approved email drafts.</span></div><Link viewTransition className="settings-service-link" to="/gmail">Manage <ArrowUpRight size={14} /></Link></div>
        </section>
      </div>

      <aside className="settings-side-column">
        <section className="settings-card settings-account-card" aria-labelledby="settings-account-title">
          <div className="settings-card-heading"><span className="settings-card-icon"><Settings2 size={18} /></span><div><h2 id="settings-account-title">Account</h2><p>Your FreelanceReach account details.</p></div></div>
          <dl className="settings-account-details"><div><dt>Signed in as</dt><dd>{profile.email || user?.email || '—'}</dd></div><div><dt>Member since</dt><dd>{memberSince || 'Date unavailable'}</dd></div></dl>
        </section>
        <div className="settings-note"><span><Check size={16} /></span><p><strong>Your account is private</strong><br />Your profile details are only used to personalize your workspace and outreach.</p></div>
      </aside>
    </div>}
  </section>
}
