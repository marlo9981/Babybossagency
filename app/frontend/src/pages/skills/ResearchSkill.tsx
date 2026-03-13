import { useState, KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { Search, Loader2, ExternalLink, Globe, Cpu } from 'lucide-react'
import { skills } from '../../api'

export default function ResearchSkill() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  async function handleRun() {
    if (!message.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await skills.research(message.trim())
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun() }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Search size={24} className="text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-white">Research Agent</h1>
          <p className="text-muted text-sm">Natural language research with live web data. Costs 1 credit.</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-sidebar border border-border rounded-xl p-6 space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKey}
          placeholder="What do you want to research? e.g. Top leather wallet trends in Singapore Q1 2026"
          rows={3}
          className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-muted resize-none focus:outline-none focus:border-accent"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleRun}
          disabled={loading || !message.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Research
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Topic + data source badge */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
              {result.topic}
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
              result.data_source === 'live'
                ? 'bg-green-900/30 text-green-400'
                : 'bg-yellow-900/30 text-yellow-400'
            }`}>
              {result.data_source === 'live'
                ? <><Globe size={11} /> Live web data</>
                : <><Cpu size={11} /> AI-estimated</>
              }
            </span>
          </div>

          {/* Summary */}
          <div className="bg-sidebar border border-border rounded-xl p-6">
            <h2 className="font-semibold text-white mb-3">Executive Summary</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
          </div>

          {/* Findings accordion */}
          {result.findings?.length > 0 && (
            <div className="bg-sidebar border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-white">Findings</h2>
              </div>
              <div className="divide-y divide-border">
                {result.findings.map((f: any, i: number) => (
                  <div key={i}>
                    <button
                      onClick={() => setOpenIndex(openIndex === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-border/20 transition-colors"
                    >
                      <span className="text-sm font-medium text-white">{f.heading}</span>
                      <span className="text-muted text-lg">{openIndex === i ? '−' : '+'}</span>
                    </button>
                    {openIndex === i && (
                      <div className="px-6 pb-4 text-sm text-slate-300 prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{f.detail}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {result.sources?.length > 0 && (
            <div className="bg-sidebar border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-white">Sources</h2>
              </div>
              <div className="divide-y divide-border">
                {result.sources.map((s: any, i: number) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{s.title || s.url}</div>
                        <div className="text-xs text-muted mt-0.5 line-clamp-2">{s.snippet}</div>
                      </div>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex-shrink-0"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
