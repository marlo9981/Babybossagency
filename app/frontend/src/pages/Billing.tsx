import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CreditCard, Zap } from 'lucide-react'
import { billing } from '../api'

export default function Billing() {
  const [params] = useSearchParams()
  const [sub, setSub] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [creditPacks, setCreditPacks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    billing.subscription().then(setSub).catch(() => {})
    billing.plans().then((r) => { setPlans(r.plans); setCreditPacks(r.credit_packs) }).catch(() => {})
  }, [])

  function handleCheckout(type: string, priceId: string) {
    setLoading(true)
    billing.checkout(type, priceId)
      .then((r) => { window.location.href = r.url })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  function handlePortal() {
    billing.portal().then((r) => { window.location.href = r.url }).catch(console.error)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-muted text-sm">Manage your subscription and credits.</p>
      </div>

      {params.get('success') === '1' && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded-xl px-5 py-4 text-green-300 text-sm">
          <Check size={16} /> Payment successful! Your plan has been updated.
        </div>
      )}

      {/* Current plan */}
      {sub && (
        <div className="bg-sidebar border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-muted">Current Plan</div>
              <div className="text-xl font-bold text-white capitalize">{sub.plan}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted">Credits</div>
              <div className="text-2xl font-bold text-accent">{sub.credits}</div>
            </div>
          </div>
          {sub.stripe_customer_id && (
            <button
              onClick={handlePortal}
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <CreditCard size={14} /> Manage billing & invoices
            </button>
          )}
        </div>
      )}

      {/* Upgrade */}
      {sub?.plan === 'free' && (
        <div className="bg-sidebar border border-accent/40 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-1">Upgrade to Agency</h2>
          <p className="text-sm text-muted mb-4">Unlock all agency tools, workflows, and 50 credits/month.</p>
          {plans.filter((p) => p.id === 'agency').map((p) => (
            <button
              key={p.id}
              onClick={() => handleCheckout('subscription', p.stripe_price_id)}
              disabled={loading || !p.stripe_price_id}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgrade — ${p.price}/mo
            </button>
          ))}
        </div>
      )}

      {/* Credit packs */}
      <div>
        <h2 className="font-semibold text-white mb-1">Buy Credits</h2>
        <p className="text-sm text-muted mb-4">Analytics: 2 credits/run · Research: 1 credit/run</p>
        <div className="grid grid-cols-2 gap-4">
          {creditPacks.map((pack) => (
            <div key={pack.credits} className="bg-sidebar border border-border rounded-xl p-5 text-center">
              <Zap size={20} className="text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-accent">{pack.credits}</div>
              <div className="text-sm text-muted mb-3">credits</div>
              <div className="text-lg font-semibold mb-4">${pack.price}</div>
              <button
                onClick={() => handleCheckout('credits', pack.price_id)}
                disabled={loading || !pack.price_id}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Buy ${pack.price}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage log */}
      {sub?.usage?.length > 0 && (
        <div>
          <h2 className="font-semibold text-white mb-4">Credit Usage</h2>
          <div className="bg-sidebar border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wider text-left">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Skill</th>
                  <th className="px-5 py-3">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sub.usage.map((e: any, i: number) => (
                  <tr key={i} className="hover:bg-border/20">
                    <td className="px-5 py-3 text-muted">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-white capitalize">{e.skill}</td>
                    <td className="px-5 py-3 text-accent">{e.credits_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
