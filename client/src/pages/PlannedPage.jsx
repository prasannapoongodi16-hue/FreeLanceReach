import { ArrowLeft, ArrowUpRight, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const details = {
  Leads: 'A focused place to keep promising client opportunities organized.',
  Discovery: 'Explore potential clients and find opportunities that fit your work.',
  'Website analysis': 'Review a prospect’s website before starting a conversation.',
  'Email drafts': 'Prepare thoughtful outreach drafts for your leads.',
  Gmail: 'Connect your Gmail account and manage approved outreach.',
  Settings: 'Manage your workspace preferences and account connections.',
}

export default function PlannedPage({ section }) {
  return <div className="planned-page"><div className="planned-back"><Link viewTransition to="/dashboard"><ArrowLeft size={15} /> Back to overview</Link><span><Clock3 size={14} /> In development</span></div><div className="planned-card"><div className="planned-illustration"><div className="planned-orbit orbit-one" /><div className="planned-orbit orbit-two" /><span><Sparkles size={27} /></span><i className="spark spark-a">✳</i><i className="spark spark-b">✦</i></div><p className="eyebrow">A new part of your workspace</p><h1>{section}</h1><p className="planned-description">{details[section]} This section is planned and will become available in a future update.</p><div className="planned-note"><span><Clock3 size={16} /></span><p><strong>Coming soon</strong><br />Your signed-in workspace is ready. We’ll add this area when the feature is available.</p></div><Link viewTransition className="button-primary" to="/dashboard">Return to overview <ArrowUpRight size={16} /></Link></div><div className="planned-footer">Your workspace is growing, one step at a time.</div></div>
}
