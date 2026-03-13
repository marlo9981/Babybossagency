import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, Wrench, GitBranch, FolderOpen,
  CreditCard, BarChart2, Search, LogOut
} from 'lucide-react'
import { clients, auth } from '../api'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/outputs', icon: FolderOpen, label: 'Outputs' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
]

const skills = [
  { to: '/skills/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/skills/research', icon: Search, label: 'Research' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [activeClient, setActiveClient] = useState<string | null>(null)
  const [clientList, setClientList] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    clients.active().then((r) => setActiveClient(r.active_client)).catch(() => {})
    clients.list().then((r) => setClientList(r.clients)).catch(() => {})
    auth.me().then(setUser).catch(() => {})
  }, [])

  function handleActivate(slug: string) {
    clients.activate(slug).then(() => setActiveClient(slug)).catch(() => {})
  }

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col border-r border-border h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <span className="text-accent font-bold text-lg tracking-tight">Agency</span>
        <span className="text-slate-400 text-lg"> Dashboard</span>
      </div>

      {/* Active client badge */}
      {activeClient && (
        <div className="px-5 py-2 bg-accent/10 border-b border-border text-xs text-accent font-medium truncate">
          {activeClient}
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-slate-400 hover:bg-border/40 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted uppercase tracking-wider">
          Skills
        </div>
        {skills.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-slate-400 hover:bg-border/40 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Client switcher */}
      {clientList.length > 0 && (
        <div className="px-3 py-3 border-t border-border">
          <select
            value={activeClient || ''}
            onChange={(e) => handleActivate(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-accent"
          >
            <option value="" disabled>Switch client…</option>
            {clientList.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-border flex items-center justify-between">
        <div className="text-xs text-slate-400 truncate">
          {user?.email}
          {user?.plan !== 'free' && (
            <span className="ml-1 text-accent">[{user.plan}]</span>
          )}
        </div>
        <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors ml-2">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
