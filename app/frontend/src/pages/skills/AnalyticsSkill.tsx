import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { BarChart2, Loader2, Upload, Printer } from 'lucide-react'
import { skills } from '../../api'
import ChartPanel from '../../components/ChartPanel'

export default function AnalyticsSkill() {
  const [source, setSource] = useState<'csv' | 'ga4'>('csv')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleRun() {
    if (!dateFrom || !dateTo) { setError('Date range required'); return }
    if (source === 'csv' && !file) { setError('Please select a CSV file'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await skills.analytics(source, dateFrom, dateTo, file || undefined)
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 size={24} className="text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-muted text-sm">Upload CSV or connect GA4 for AI-powered insights. Costs 2 credits.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-sidebar border border-border rounded-xl p-6 space-y-5">
        {/* Source */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">Data Source</label>
          <div className="flex gap-3">
            {(['csv', 'ga4'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  source === s
                    ? 'bg-accent border-accent text-white'
                    : 'bg-bg border-border text-slate-300 hover:border-slate-400'
                }`}
              >
                {s === 'csv' ? 'CSV Upload' : 'GA4 API'}
              </button>
            ))}
          </div>
          {source === 'csv' && (
            <p className="text-xs text-muted mt-2">
              Also works with Meta Ads exports — download your Meta report as CSV and upload here.
            </p>
          )}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* File upload */}
        {source === 'csv' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">CSV File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-accent rounded-xl p-6 text-center cursor-pointer transition-colors"
            >
              <Upload size={20} className="text-muted mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {file ? file.name : 'Click to select CSV file'}
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart2 size={16} />}
          Analyse
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="bg-sidebar border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Summary</h2>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
              >
                <Printer size={13} /> Export
              </button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300">
              <ReactMarkdown>{result.summary}</ReactMarkdown>
            </div>
          </div>

          {result.insights?.length > 0 && (
            <div className="bg-sidebar border border-border rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Key Insights</h2>
              <ul className="space-y-2">
                {result.insights.map((ins: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-accent font-bold mt-0.5">{i + 1}.</span>
                    {ins}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.chart_data?.length > 0 && (
            <div className="bg-sidebar border border-border rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Chart</h2>
              <ChartPanel data={result.chart_data} columns={result.columns || []} />
            </div>
          )}

          <div className="text-xs text-muted text-right">
            {result.total_rows} rows analysed
          </div>
        </div>
      )}
    </div>
  )
}
