import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store'
import { HomeView } from './components/HomeView'
import { StatsView } from './components/StatsView'
import { HabitsView } from './components/HabitsView'
import { getSyncConfig, syncNow } from './lib/sync'

/** 同期が設定されていれば、起動時と変更のたび(2.5秒デバウンス)に自動同期する */
function SyncManager() {
  const { data, dispatch } = useStore()
  useEffect(() => {
    if (!getSyncConfig()) return
    const t = setTimeout(() => {
      syncNow(data, (merged) => dispatch({ type: 'import', data: merged }))
    }, 2500)
    return () => clearTimeout(t)
  }, [data, dispatch])
  return null
}

type Tab = 'home' | 'stats' | 'habits'

const icons: Record<Tab, (active: boolean) => JSX.Element> = {
  home: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  ),
  stats: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" aria-hidden>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  ),
  habits: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="9" cy="7" r="2.6" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <circle cx="15" cy="17" r="2.6" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  ),
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: '記録' },
  { id: 'stats', label: '統計' },
  { id: 'habits', label: '習慣' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <StoreProvider>
      <SyncManager />
      {tab === 'home' && <HomeView />}
      {tab === 'stats' && <StatsView />}
      {tab === 'habits' && <HabitsView />}
      <nav className="tabbar" aria-label="メインナビゲーション">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {icons[t.id](tab === t.id)}
            {t.label}
          </button>
        ))}
      </nav>
    </StoreProvider>
  )
}
