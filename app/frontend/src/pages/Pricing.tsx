import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { billing } from '../api'

export default function Pricing() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<any[]>([])
  const [creditPacks, setCreditPacks] = useState<any[]>([])

  useEffect(() => {
    billing.plans().then((r) => { setPlans(r.plans); setCreditPacks(r.credit_packs) }).catch(() => {})
  }, [])

  function handleSubscribe(priceId: string, type: string) {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate(`/register?next=/billing`)
      return
    }
    billing.checkout(type, priceId).then((r) => window.location.href = r.url).catch(console.error)
  }

  return (
    <div className="min-h-screen bg-bg text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">
            Simple, transparent <span className="text-accent">pricing</span>
          </h1>
          <p className="text-muted">Run your whole agency from one dashboard.</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-sidebar border rounded-2xl p-6 flex flex-col gap-4 ${
                plan.id === 'agency' ? 'border-accent' : 'border-border'
              }`}
            >
              {plan.id === 'agency' && (
                <span className="text-xs font-semibold bg-accent text-white px-3 py-1 rounded-full w-fit">
                  Most Popular
                </span>
              )}
              <div>
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <div className="mt-1">
                  {plan.price === null ? (
                    <span className="text-2xl font-bold text-accent">Custom</span>
                  ) : plan.price === 0 ? (
                    <span className="text-2xl font-bold">Free</span>
                  ) : (
                    <span className="text-2xl font-bold">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted">/{plan.interval}</span>
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features?.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check size={14} className="text-accent mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === 'free' && (
                <Link
                  to="/register"
                  className="block text-center bg-bg border border-border hover:border-accent text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Get started free
                </Link>
              )}
              {plan.id === 'agency' && plan.stripe_price_id && (
                <button
                  onClick={() => handleSubscribe(plan.stripe_price_id, 'subscription')}
                  className="bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Subscribe — ${plan.price}/mo
                </button>
              )}
              {plan.id === 'retainer' && (
                <a
                  href="mailto:hello@youragency.com"
                  className="block text-center bg-bg border border-border hover:border-accent text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Contact us
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Credit packs */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">Skills Credit Packs</h2>
          <p className="text-muted text-sm">Analytics: 2 credits/run · Research: 1 credit/run</p>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-12">
          {creditPacks.map((pack) => (
            <div key={pack.credits} className="bg-sidebar border border-border rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-accent">{pack.credits}</div>
              <div className="text-sm text-muted mb-3">credits</div>
              <div className="text-lg font-semibold mb-4">${pack.price}</div>
              <button
                onClick={() => handleSubscribe(pack.price_id, 'credits')}
                className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Buy ${pack.price}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
