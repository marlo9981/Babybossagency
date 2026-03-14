import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Register from './pages/Register'
import Pricing from './pages/Pricing'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Tools from './pages/Tools'
import Workflows from './pages/Workflows'
import Outputs from './pages/Outputs'
import Billing from './pages/Billing'
import AnalyticsSkill from './pages/skills/AnalyticsSkill'
import ResearchSkill from './pages/skills/ResearchSkill'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <AuthGuard>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-bg p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/workflows" element={<Workflows />} />
                  <Route path="/outputs" element={<Outputs />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/skills/analytics" element={<AnalyticsSkill />} />
                  <Route path="/skills/research" element={<ResearchSkill />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </AuthGuard>
        }
      />
    </Routes>
  )
}
