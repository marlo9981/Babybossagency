import { useEffect, useState, FormEvent } from 'react'
import { clients } from '../api'
import { Plus, Check } from 'lucide-react'

export default function Clients() {
  const [list, setList] = useState<any[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', market: '', differentiators: '',
    primary_color: '#3B82F6', secondary_color: '#6B7280',
    accent_color: '#3B82F6', text_color: '#111827', font: 'Inter',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reload() {
    clients.list().then((r) => setList(r.clients)).catch(() => {})
    clients.active().then((r) => setActive(r.active_client)).catch(() => {})
  }

  useEffect(() => { reload() }, [])

  async function handleActivate(slug: string) {
    await clients.activate(slug).catch(() => {})
    setActive(slug)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await clients.create(form)
      setShowForm(false)
      reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-muted text-sm">Manage client profiles and brand configs.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-sidebar border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">New Client</h2>
          {[
            ['name', 'Client Name', 'text'],
            ['description', 'Description', 'text'],
            ['market', 'Target Market', 'text'],
            ['differentiators', 'Differentiators (comma-separated)', 'text'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-slate-300 mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            {[
              ['primary_color', 'Primary Color'],
              ['secondary_color', 'Secondary Color'],
              ['accent_color', 'Accent Color'],
              ['text_color', 'Text Color'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-8 h-8 rounded border border-border bg-bg cursor-pointer"
                />
                <label className="text-sm text-slate-300">{label}</label>
              </div>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? 'Creating…' : 'Create Client'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-bg border border-border hover:border-slate-400 text-slate-300 text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Client cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <div key={c.slug} className="bg-sidebar border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.primary_color }}
              />
              <div>
                <div className="font-medium text-white text-sm">{c.name}</div>
                <div className="text-xs text-muted">{c.slug}</div>
              </div>
            </div>
            <button
              onClick={() => handleActivate(c.slug)}
              className={`w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                active === c.slug
                  ? 'bg-accent border-accent text-white'
                  : 'bg-bg border-border text-slate-300 hover:border-accent hover:text-white'
              }`}
            >
              {active === c.slug && <Check size={12} />}
              {active === c.slug ? 'Active' : 'Set Active'}
            </button>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-center text-muted py-12">No clients yet. Add your first client.</p>
      )}
    </div>
  )
}
