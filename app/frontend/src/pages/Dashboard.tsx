import { useEffect, useState } from 'react'
import CommandBar from '../components/CommandBar'
import { outputs } from '../api'

export default function Dashboard() {
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    outputs.list().then((r) => setRecent(r.files.slice(0, 5))).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-muted text-sm">Type a natural language command to run any agency tool.</p>
      </div>

      <CommandBar />

      {recent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Recent Outputs
          </h2>
          <div className="space-y-3">
            {recent.map((f) => (
              <div
                key={f.filename}
                className="bg-sidebar border border-border rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-white">{f.filename}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {f.client} · {f.type} · {new Date(f.date * 1000).toLocaleDateString()}
                  </div>
                </div>
                <a
                  href={outputs.downloadUrl(f.filename)}
                  className="text-xs text-accent hover:underline"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
