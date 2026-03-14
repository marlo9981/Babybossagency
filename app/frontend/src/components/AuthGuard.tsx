import { useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../api'

interface User {
  id: number
  email: string
  plan: string
  credits: number
}

export let currentUser: User | null = null

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      navigate('/login')
      return
    }
    auth.me()
      .then((u) => {
        currentUser = u
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/login')
      })
  }, [navigate])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-slate-400">
        Loading…
      </div>
    )
  }

  return <>{children}</>
}
