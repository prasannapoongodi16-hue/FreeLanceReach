import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, Mail, RefreshCw, ShieldCheck, Unplug } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import api, { getApiError } from '../lib/api'

export default function GmailSettingsPage() {
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [authorizationUrl, setAuthorizationUrl] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const loadStatus = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/gmail/status')
      setConnection({ connected: Boolean(data.connected), connectedAt: data.connectedAt || null, reconnectRequired: Boolean(data.reconnectRequired) })
    } catch (requestError) {
      setError(getApiError(requestError, 'Could not check your Gmail connection.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadStatus)
  }, [loadStatus])

  useEffect(() => {
    Promise.resolve().then(() => {
      const result = new URLSearchParams(location.search).get('gmail')
      if (result !== 'connected' && result !== 'failed') return
      setAuthorizationUrl('')
      setNotice(result === 'connected' ? 'Gmail connected successfully.' : '')
      if (result === 'failed') setError('Google could not complete the connection. You can try again.')
      navigate(location.pathname, { replace: true })
      loadStatus()
    })
  }, [location.pathname, location.search, loadStatus, navigate])

  async function startConnect() {
    setBusy('connect'); setError(''); setNotice(''); setAuthorizationUrl('')
    try {
      const { data } = await api.post('/gmail/connect')
      const parsed = new URL(data.authorizationUrl)
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'accounts.google.com') throw new Error('Google returned an unexpected authorization destination.')
      setAuthorizationUrl(parsed.toString())
      setNotice('Connection ready. Continue to Google to choose an account and approve access.')
    } catch (requestError) {
      setError(getApiError(requestError, 'Could not start the Gmail connection.'))
    } finally { setBusy('') }
  }

  function continueToGoogle() {
    if (!authorizationUrl) return
    window.location.assign(authorizationUrl)
  }

  async function disconnect() {
    if (!connection?.connected || !window.confirm('Disconnect Gmail? FreelanceReach will remove the saved connection. You can reconnect later.')) return
    setBusy('disconnect'); setError(''); setNotice(''); setAuthorizationUrl('')
    try {
      const { data } = await api.delete('/gmail/disconnect')
      setConnection({ connected: false, connectedAt: null, reconnectRequired: false })
      setNotice(data.message || 'Gmail disconnected.')
    } catch (requestError) {
      setError(getApiError(requestError, 'Could not disconnect Gmail.'))
    } finally { setBusy('') }
  }

  const reconnectRequired = connection?.reconnectRequired
  const connected = connection?.connected && !reconnectRequired

  return <section className="gmail-settings-page" aria-labelledby="gmail-settings-title">
    <div className="leads-heading analysis-heading"><div><p className="lead-kicker">ACCOUNT CONNECTION</p><h1 id="gmail-settings-title">Gmail settings</h1><p>Connect the account you want to use for approved email drafts.</p></div><span className="analysis-provider"><Mail size={14} /> Gmail</span></div>
    {error && <div className="analysis-alert analysis-alert-error" role="alert"><AlertTriangle size={17} /><div><strong>Action needs attention</strong><p>{error}</p></div></div>}
    {notice && <div className="email-notice" role="status"><Check size={16} />{notice}</div>}
    <section className="analysis-findings-card gmail-connection-card" aria-labelledby="gmail-connection-title">
      <div className="gmail-card-heading"><span className="gmail-icon"><Mail size={21} /></span><div><p className="lead-kicker">SEND ACCOUNT</p><h2 id="gmail-connection-title">Gmail connection</h2></div><span className={`gmail-state${connected ? ' is-connected' : reconnectRequired ? ' needs-reconnect' : ''}`}><span />{loading ? 'Checking' : connected ? 'Connected' : reconnectRequired ? 'Reconnect required' : 'Not connected'}</span></div>
      {loading ? <div className="lead-state" role="status"><span className="lead-spinner" />Checking Gmail connection…</div> : <>
        {connected ? <div className="gmail-connection-details"><div><ShieldCheck size={17} /><p><strong>Account connected</strong><span>Approved drafts can use this Gmail account after you review and approve each message.</span></p></div><p className="gmail-connected-date">Connected {connection.connectedAt ? new Date(connection.connectedAt).toLocaleString() : 'date unavailable'}</p></div>
          : reconnectRequired ? <div className="gmail-state-message warning"><AlertTriangle size={17} /><p><strong>Gmail access needs to be restored</strong><span>The saved connection was revoked or expired. Reconnect your account to send approved drafts.</span></p></div>
            : <div className="gmail-state-message"><p>Connect Gmail to send approved drafts from your account. You’ll review and approve every email before it is sent.</p></div>}
        <div className="gmail-actions">
          {authorizationUrl ? <button className="lead-button primary" onClick={continueToGoogle}><ExternalLink size={15} />Continue to Google</button> : <button className="lead-button primary" onClick={startConnect} disabled={Boolean(busy)}><RefreshCw size={15} />{busy === 'connect' ? 'Preparing connection…' : connected ? 'Reconnect Gmail' : 'Connect Gmail'}</button>}
          {connected && <button className="lead-button secondary gmail-disconnect" onClick={disconnect} disabled={Boolean(busy)}><Unplug size={15} />{busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}</button>}
          {!authorizationUrl && !connected && <button className="gmail-refresh" onClick={() => { setLoading(true); loadStatus() }} disabled={Boolean(busy)} aria-label="Refresh Gmail connection status"><RefreshCw size={15} />Refresh status</button>}
        </div>
      </>}
    </section>
    <p className="gmail-privacy-note"><ShieldCheck size={14} /> FreelanceReach stores encrypted connection tokens. Your authorization details are handled through Google’s secure sign-in page.</p>
  </section>
}
