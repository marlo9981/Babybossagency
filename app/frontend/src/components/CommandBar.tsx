import { useState, KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { command } from '../api'

const HISTORY_KEY = 'cmd_history'

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}

function saveHistory(msg: string) {
  const h = getHistory().filter((x) => x !== msg).slice(0, 9)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([msg, ...h]))
}

export default function CommandBar() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(true)

  async function handleSubmit() {
    if (!message.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    saveHistory(message.trim())
    try {
      const res = await command.run(message.trim())
      setResult(res)
      setExpanded(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKey}
          placeholder="What do you want to do? e.g. Write 3 Instagram captions for the wallet launch"
          rows={2}
          className="flex-1 bg-sidebar border border-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-muted resize-none focus:outline-none focus:border-accent"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-xl text-white flex items-center gap-2 text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 bg-sidebar border border-border rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer"
            onClick={() => setExpanded((e) => !e)}
          >
            <span className="text-sm text-slate-300 font-medium">
              {result.intent ? `${result.intent} → ${result.tool}` : 'Result'}
            </span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {expanded && (
            <div className="px-4 py-4 text-sm text-slate-300 prose prose-invert prose-sm max-w-none overflow-x-auto">
              <ReactMarkdown>
                {typeof result.output === 'string'
                  ? result.output
                  : JSON.stringify(result.output, null, 2)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {getHistory().length > 0 && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {getHistory().map((h, i) => (
            <button
              key={i}
              onClick={() => setMessage(h)}
              className="text-xs px-3 py-1 bg-bg border border-border rounded-full text-muted hover:text-slate-300 hover:border-slate-500 transition-colors truncate max-w-xs"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
