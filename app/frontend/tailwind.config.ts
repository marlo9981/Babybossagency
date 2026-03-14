import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F172A',
        sidebar: '#1E293B',
        card: '#1E293B',
        border: '#334155',
        accent: '#3B82F6',
        'accent-hover': '#2563EB',
        muted: '#64748B',
      },
    },
  },
  plugins: [],
} satisfies Config
