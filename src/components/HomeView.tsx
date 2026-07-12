import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Habit } from '../types'
import { formatDateLong, todayKey } from '../lib/dates'
import { aggregateByDay, currentStreak, thisWeekProgress } from '../lib/stats'

export const seriesVar = (slot: number) => `var(--series-${(slot % 8) + 1})`

const metricLabel = (h: Habit, value: number) =>
  h.metric === 'none' ? '' : `${Number.isInteger(value) ? value : value.toFixed(1)}${h.unit}`

function HabitCard({
  habit,
  onLogged,
}: {
  habit: Habit
  onLogged: (entryId: string, name: string) => void
}) {
  const { data, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>(habit.defaultValue?.toString() ?? '')
  const [note, setNote] = useState('')

  const entries = data.entries.filter((e) => e.habitId === habit.id)
  const today = todayKey()
  const todayEntries = entries.filter((e) => e.date === today)
  const todayValue = todayEntries.reduce((s, e) => s + (e.value ?? 0), 0)
  const streak = currentStreak(aggregateByDay(entries))
  const week = thisWeekProgress(data.entries, habit)

  const log = (v?: number, n?: string) => {
    dispatch({ type: 'addEntry', habitId: habit.id, value: v, note: n || undefined })
    // reducerが発番したIDはここでは取れないので、記録後の最新エントリを親に伝える方式にせず
    // 「直近の記録を取り消す」トーストは habitId ベースで動かす
    onLogged(habit.id, habit.name)
  }

  return (
    <div className="card">
      <div className="habit-card">
        <div className="habit-emoji">{habit.emoji}</div>
        <div className="habit-info">
          <div className="habit-name">
            <span className="color-dot" style={{ background: seriesVar(habit.colorSlot) }} />
            {habit.name}
          </div>
          <div className="habit-sub">
            <span className="week-dots" aria-label={`今週 ${week.count}/${week.target}回`}>
              {Array.from({ length: Math.max(week.target, week.count) }, (_, i) => (
                <span key={i} className={`dot${i < week.count ? ' filled' : ''}`} />
              ))}
              <span style={{ marginLeft: 4 }}>
                {week.count}/{week.target}
              </span>
            </span>
            {streak > 0 && (
              <span className={`streak${streak >= 3 ? ' hot' : ''}`}>🔥 {streak}日連続</span>
            )}
            {todayEntries.length > 0 && (
              <span>
                今日 {todayEntries.length}回 {metricLabel(habit, todayValue)}
              </span>
            )}
          </div>
        </div>
        <button
          className={`log-btn${todayEntries.length > 0 ? ' done' : ''}`}
          aria-label={`${habit.name}を記録する`}
          onClick={() => log(habit.metric === 'none' ? undefined : habit.defaultValue)}
        >
          {todayEntries.length > 0 ? '✓' : '+'}
        </button>
      </div>
      <button className="detail-toggle" onClick={() => setOpen(!open)}>
        {open ? '閉じる' : '詳しく記録する ▸'}
      </button>
      {open && (
        <div className="detail-form">
          {habit.metric !== 'none' && (
            <input
              type="number"
              inputMode="decimal"
              placeholder={habit.unit}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={`記録値(${habit.unit})`}
            />
          )}
          <input
            type="text"
            placeholder="メモ(任意)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="save"
            onClick={() => {
              const v = habit.metric === 'none' ? undefined : Number(value) || undefined
              log(v, note)
              setNote('')
              setOpen(false)
            }}
          >
            記録
          </button>
        </div>
      )}
    </div>
  )
}

export function HomeView() {
  const { data, dispatch } = useStore()
  const [toast, setToast] = useState<{ habitId: string; name: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const undo = () => {
    if (!toast) return
    // その習慣の一番新しいエントリを取り消す
    const latest = [...data.entries]
      .filter((e) => e.habitId === toast.habitId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
    if (latest) dispatch({ type: 'deleteEntry', entryId: latest.id })
    setToast(null)
  }

  const habits = data.habits.filter((h) => !h.archived)

  return (
    <>
      <header className="app-header">
        <h1>今日の記録</h1>
        <div className="date">{formatDateLong(todayKey())}</div>
      </header>
      <main className="app-main">
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} onLogged={(habitId, name) => setToast({ habitId, name })} />
        ))}
        {habits.length === 0 && (
          <p className="empty-note">習慣がありません。「習慣」タブから追加してください。</p>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <span>{toast.name}を記録しました</span>
          <button onClick={undo}>取り消す</button>
        </div>
      )}
    </>
  )
}
