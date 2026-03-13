const BASE = import.meta.env.VITE_API_URL || ''

function token() {
  return localStorage.getItem('token') || ''
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: number; email: string; plan: string; credits: number }>('/auth/me'),
}

// ── Billing ───────────────────────────────────────────────────────────────────
export const billing = {
  plans: () => request<{ plans: any[]; credit_packs: any[] }>('/billing/plans'),
  subscription: () => request<any>('/billing/subscription'),
  checkout: (type: string, price_id: string) =>
    request<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ type, price_id }),
    }),
  portal: () => request<{ url: string }>('/billing/portal', { method: 'POST' }),
  usage: () => request<any[]>('/billing/usage'),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clients = {
  list: () => request<{ clients: any[] }>('/clients'),
  active: () => request<{ active_client: string | null }>('/clients/active'),
  activate: (slug: string) =>
    request<any>(`/clients/${slug}/activate`, { method: 'POST' }),
  get: (slug: string) => request<any>(`/clients/${slug}`),
  create: (data: any) =>
    request<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Tools ─────────────────────────────────────────────────────────────────────
export const tools = {
  contentWriter: (data: any) =>
    request<any>('/tools/content-writer', { method: 'POST', body: JSON.stringify(data) }),
  audienceAnalyzer: (data: any) =>
    request<any>('/tools/audience-analyzer', { method: 'POST', body: JSON.stringify(data) }),
  seoAnalyzer: (data: any) =>
    request<any>('/tools/seo-analyzer', { method: 'POST', body: JSON.stringify(data) }),
  mediaPlanner: (data: any) =>
    request<any>('/tools/media-planner', { method: 'POST', body: JSON.stringify(data) }),
  adBrief: (data: any) =>
    request<any>('/tools/ad-brief', { method: 'POST', body: JSON.stringify(data) }),
  reporter: (data: any) =>
    request<any>('/tools/reporter', { method: 'POST', body: JSON.stringify(data) }),
  socialPoster: (data: any) =>
    request<any>('/tools/social-poster', { method: 'POST', body: JSON.stringify(data) }),
  emailSender: (data: any) =>
    request<any>('/tools/email-sender', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Outputs ───────────────────────────────────────────────────────────────────
export const outputs = {
  list: () => request<{ files: any[] }>('/outputs'),
  downloadUrl: (filename: string) => `${BASE}/outputs/${encodeURIComponent(filename)}?token=${token()}`,
}

// ── Command ───────────────────────────────────────────────────────────────────
export const command = {
  run: (message: string, client?: string) =>
    request<any>('/command', { method: 'POST', body: JSON.stringify({ message, client }) }),
}

// ── Workflows ─────────────────────────────────────────────────────────────────
export const workflows = {
  list: () => request<{ workflows: any[] }>('/workflows'),
  get: (name: string) => request<any>(`/workflows/${name}`),
}

// ── Skills ────────────────────────────────────────────────────────────────────
export const skills = {
  analytics: async (source: string, dateFrom: string, dateTo: string, file?: File) => {
    const form = new FormData()
    form.append('source', source)
    form.append('date_from', dateFrom)
    form.append('date_to', dateTo)
    if (file) form.append('file', file)
    const res = await fetch(`${BASE}/skills/analytics`, {
      method: 'POST',
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
    }
    return res.json()
  },
  research: (message: string) =>
    request<any>('/skills/research', { method: 'POST', body: JSON.stringify({ message }) }),
}
