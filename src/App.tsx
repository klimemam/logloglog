import { useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore } from './store'
import { HomeView } from './components/HomeView'
import { StatsView } from './components/StatsView'
import { HabitsView } from './components/HabitsView'
import { SettingsView } from './components/SettingsView'
import { Sheet } from './components/Sheet'
import { getSyncConfig, handleAuthRedirect, syncNow } from './lib/sync'
import { isNativeApp } from './lib/backend'
import { initNativeAuthListener } from './lib/native-auth'
import { applyUpdate, checkForUpdate, dismissUpdate, isDismissed } from './lib/update'
import type { UpdateResult } from './lib/update'

/** 起動3秒後にバックグラウンドでアップデートを確認し、あればバナーを出す */
function UpdateBanner() {
  const [info, setInfo] = useState<UpdateResult | null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await checkForUpdate()
        if (r.available && r.latest && !isDismissed(r.latest)) setInfo(r)
      } catch {
        // オフライン等では黙ってスキップ(設定タブから手動確認できる)
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  if (!info) return null
  const versionLabel = info.latest?.startsWith('v') ? ` ${info.latest}` : ''
  return (
    <div className="update-banner" role="status">
      <span className="update-banner-text">🆕 新しいバージョン{versionLabel}があります</span>
      <button className="update-banner-action" onClick={applyUpdate}>
        {isNativeApp() ? 'ダウンロード' : '更新'}
      </button>
      <button
        className="update-banner-close"
        aria-label="この通知を閉じる"
        onClick={() => {
          dismissUpdate(info.latest ?? '')
          setInfo(null)
        }}
      >
        ✕
      </button>
    </div>
  )
}

// Googleログインから戻ってきた場合、URLのトークンをセッションとして保存する
// (レンダリング前に一度だけ処理する)
handleAuthRedirect()

const ONBOARD_KEY = 'logloglog:onboarded'

/** 初めて開いた人向けのウェルカム画面(データがある既存ユーザーには出ない) */
function Onboarding() {
  const [open, setOpen] = useState(
    () => !localStorage.getItem(ONBOARD_KEY) && !localStorage.getItem('logloglog:v1'),
  )
  const close = () => {
    localStorage.setItem(ONBOARD_KEY, '1')
    setOpen(false)
  }
  return (
    <Sheet open={open} title="ようこそ 👋" onClose={close}>
      <div className="onboard">
        <div className="onboard-item">
          <span className="onboard-icon">✏️</span>
          <div>
            <b>開いてすぐ、ワンタップで記録</b>
            <p>ホームの「+」を押すだけ。ランニングや読書など、習慣は自由に追加できます。</p>
          </div>
        </div>
        <div className="onboard-item">
          <span className="onboard-icon">💪</span>
          <div>
            <b>筋トレはワークアウトモード</b>
            <p>種目を選ぶと前回のセットが入った状態でスタート。✓するだけで休憩タイマーも動きます。</p>
          </div>
        </div>
        <div className="onboard-item">
          <span className="onboard-icon">📈</span>
          <div>
            <b>続けるほど、成長が見える</b>
            <p>週の目標達成・連続記録・推定1RMの伸びを統計タブで確認できます。</p>
          </div>
        </div>
        <p className="onboard-note">
          データはあなたの端末の中だけに保存されます(登録不要・無料)。
          ホーム画面に追加するとアプリとして使えます。
        </p>
        <button className="primary-btn" onClick={close}>
          はじめる
        </button>
      </div>
    </Sheet>
  )
}

/** 同期が設定されていれば、起動時と変更のたび(2.5秒デバウンス)に自動同期する */
function SyncManager() {
  const { data, dispatch } = useStore()
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!getSyncConfig()) return
    const t = setTimeout(() => {
      syncNow(data, (merged) => dispatch({ type: 'import', data: merged }))
    }, 2500)
    return () => clearTimeout(t)
  }, [data, dispatch])

  // ネイティブアプリ: 外部ブラウザでのGoogleログインからディープリンクで戻ったら同期開始
  useEffect(() => {
    if (!isNativeApp()) return
    initNativeAuthListener(() => {
      syncNow(dataRef.current, (merged) => dispatch({ type: 'import', data: merged }))
    })
  }, [dispatch])

  return null
}

type Tab = 'home' | 'stats' | 'habits' | 'settings'

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
  settings: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3.2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51.97z" />
    </svg>
  ),
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: '記録' },
  { id: 'stats', label: '統計' },
  { id: 'habits', label: '習慣' },
  { id: 'settings', label: '設定' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <StoreProvider>
      <SyncManager />
      <Onboarding />
      <UpdateBanner />
      {tab === 'home' && <HomeView />}
      {tab === 'stats' && <StatsView />}
      {tab === 'habits' && <HabitsView />}
      {tab === 'settings' && <SettingsView />}
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
