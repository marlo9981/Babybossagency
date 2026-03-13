import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, ChevronUp, Play, Loader2 } from 'lucide-react'
import { tools } from '../api'

interface Tool {
  id: string
  name: string
  description: string
  fields: { key: string; label: string; type?: string; required?: boolean; default?: any }[]
  call: (data: any) => Promise<any>
}

const TOOLS: Tool[] = [
  {
    id: 'content-writer', name: 'Content Writer', description: 'Generate marketing copy for any format.',
    fields: [
      { key: 'brief', label: 'Brief', required: true },
      { key: 'fmt', label: 'Format', type: 'select' },
      { key: 'tone', label: 'Tone (optional)' },
      { key: 'count', label: 'Count', type: 'number', default: 3 },
    ],
    call: tools.contentWriter,
  },
  {
    id: 'audience-analyzer', name: 'Audience Analyzer', description: 'Analyse target audience from brand profile.',
    fields: [],
    call: tools.audienceAnalyzer,
  },
  {
    id: 'seo-analyzer', name: 'SEO Analyzer', description: 'Keyword research for a topic.',
    fields: [{ key: 'topic', label: 'Topic', required: true }, { key: 'num_results', label: 'Results', type: 'number', default: 8 }],
    call: tools.seoAnalyzer,
  },
  {
    id: 'media-planner', name: 'Media Planner', description: 'Generate a media plan with budget allocation.',
    fields: [
      { key: 'brief', label: 'Brief', required: true },
      { key: 'budget', label: 'Budget (SGD)', type: 'number' },
      { key: 'channels', label: 'Channels (comma-separated)' },
    ],
    call: (d: any) => tools.mediaPlanner({ ...d, channels: d.channels ? d.channels.split(',').map((c: string) => c.trim()) : [] }),
  },
  {
    id: 'ad-brief', name: 'Ad Brief Creator', description: 'Create an ad brief for a campaign.',
    fields: [{ key: 'campaign', label: 'Campaign', required: true }, { key: 'channel', label: 'Channel', required: true }],
    call: tools.adBrief,
  },
  {
    id: 'reporter', name: 'Performance Reporter', description: 'Generate a client performance report.',
    fields: [
      { key: 'platform', label: 'Platform', required: true },
      { key: 'date_from', label: 'From (YYYY-MM-DD)', required: true },
      { key: 'date_to', label: 'To (YYYY-MM-DD)', required: true },
    ],
    call: tools.reporter,
  },
  {
    id: 'social-poster', name: 'Social Poster', description: 'Schedule a social post (dry-run by default).',
    fields: [
      { key: 'platform', label: 'Platform', required: true },
      { key: 'caption', label: 'Caption', required: true },
      { key: 'scheduled_time', label: 'Scheduled Time (ISO 8601)', required: true },
    ],
    call: (d: any) => tools.socialPoster({ ...d, dry_run: true }),
  },
  {
    id: 'email-sender', name: 'Email Sender', description: 'Send an email campaign (dry-run by default).',
    fields: [
      { key: 'subject', label: 'Subject', required: true },
      { key: 'body', label: 'Body', required: true },
      { key: 'list_path', label: 'Recipient CSV path', required: true },
    ],
    call: (d: any) => tools.emailSender({ ...d, dry_run: true }),
  },
]

const FMT_OPTIONS = ['instagram', 'facebook', 'linkedin', 'email', 'blog', 'script', 'calendar', 'social']

function ToolCard({ tool }: { tool: Tool }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, any>>(() =>
    Object.fromEntries(tool.fields.map((f) => [f.key, f.default ?? '']))
  )
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleRun() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await tool.call(form)
      setResult(res.output)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-sidebar border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-border/20 transition-colors text-left"
      >
        <div>
          <div className="font-medium text-white text-sm">{tool.name}</div>
          <div className="text-xs text-muted mt-0.5">{tool.description}</div>
        </div>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
          {tool.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
              {f.key === 'fmt' ? (
                <select
                  value={form[f.key] || 'instagram'}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                >
                  {FMT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              )}
            </div>
          ))}

          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {result && (
            <div className="bg-bg border border-border rounded-lg p-4 text-sm text-slate-300 prose prose-invert prose-sm max-w-none overflow-x-auto">
              <ReactMarkdown>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Tools() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Tools</h1>
        <p className="text-muted text-sm">Click any tool to expand and run it.</p>
      </div>
      {TOOLS.map((t) => <ToolCard key={t.id} tool={t} />)}
    </div>
  )
}
