import { useState } from 'react'
import { StoreProvider } from './store'
import { HomeView } from './components/HomeView'
import { StatsView } from './components/StatsView'
import { HabitsView } from './components/HabitsView'

type Tab = 'home' | 'stats' | 'habits'

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '✏️', label: '記録' },
  { id: 'stats', icon: '📈', label: '統計' },
  { id: 'habits', icon: '⚙️', label: '習慣' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <StoreProvider>
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
            <span className="tab-icon" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </StoreProvider>
  )
}
