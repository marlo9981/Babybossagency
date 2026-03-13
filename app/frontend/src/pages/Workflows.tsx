import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Eye, Play, Loader2, X } from 'lucide-react'
import { workflows, command } from '../api'

export default function Workflows() {
  const [list, setList] = useState<any[]>([])
  const [viewing, setViewing] = useState<any>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<Record<string, string>>({})
  const [error, setError] = useState<Record<string, string>>({})

  useEffect(() => {
    workflows.list().then((r) => setList(r.workflows)).catch(() => {})
  }, [])

  async function handleView(name: string) {
    const w = await workflows.get(name).catch(() => null)
    if (w) setViewing(w)
  }

  async function handleRun(name: string) {
    setRunningId(name)
    setRunResult((r) => { const n = { ...r }; delete n[name]; return n })
    setError((r) => { const n = { ...r }; delete n[name]; return n })
    try {
      const res = await command.run(`Run workflow: ${name}`)
      setRunResult((r) => ({ ...r, [name]: typeof res.output === 'string' ? res.output : JSON.stringify(res.output, null, 2) }))
    } catch (e: any) {
      setError((r) => ({ ...r, [name]: e.message }))
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Workflows</h1>
        <p className="text-muted text-sm">SOPs from the WAT framework. View docs or run via AI command router.</p>
      </div>

      <div className="space-y-3">
        {list.map((w) => (
          <div key={w.name} className="bg-sidebar border border-border rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{w.name.replace(/_/g, ' ')}</div>
                <div className="text-xs text-muted mt-0.5 truncate">{w.objective}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleView(w.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border hover:border-slate-400 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  <Eye size={12} /> View
                </button>
                <button
                  onClick={() => handleRun(w.name)}
                  disabled={runningId === w.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                >
                  {runningId === w.name
                    ? <><Loader2 size={12} className="animate-spin" /> Running…</>
                    : <><Play size={12} /> Run</>
                  }
                </button>
              </div>
            </div>

            {error[w.name] && (
              <div className="mt-3 text-red-400 text-xs">{error[w.name]}</div>
            )}
            {runResult[w.name] && (
              <div className="mt-3 bg-bg border border-border rounded-lg p-3 text-xs text-slate-300 prose prose-invert prose-sm max-w-none overflow-x-auto">
                <ReactMarkdown>{runResult[w.name]}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-center text-muted py-12">No workflows found in the workflows/ directory.</p>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-sidebar border border-border rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <span className="font-medium text-white">{viewing.name}</span>
              <button onClick={() => setViewing(null)} className="text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{viewing.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
