import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Entry, Habit } from '../types'
import { formatDateLong, todayKey } from '../lib/dates'
import { aggregateByDay, currentStreak, recentExercises, thisWeekProgress } from '../lib/stats'
import { bodyweightExercises, exerciseCatalog } from '../lib/exercises'

export const seriesVar = (slot: number) => `var(--series-${(slot % 8) + 1})`

const metricLabel = (h: Habit, value: number) =>
  h.metric === 'none' ? '' : `${Number.isInteger(value) ? value : value.toFixed(1)}${h.unit}`

const FREE_INPUT = '__free__'

/** 筋トレの記録フォーム: 種目を選ぶと前回のセット×回数×重量が入った状態で開く */
function StrengthLogger({
  habit,
  entries,
  onLogged,
  onClose,
}: {
  habit: Habit
  entries: Entry[]
  onLogged: () => void
  onClose: () => void
}) {
  const { dispatch } = useStore()
  const recent = useMemo(() => recentExercises(entries), [entries])
  const [exercise, setExercise] = useState(recent[0] ?? '')
  const [freeName, setFreeName] = useState('')
  const isFree = exercise === FREE_INPUT
  const chosenName = isFree ? freeName.trim() : exercise

  const lastOfChosen = useMemo(
    () => [...entries].reverse().find((e) => e.exercise === chosenName),
    [entries, chosenName],
  )
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weight, setWeight] = useState('')

  // 種目を切り替えたら前回の記録をプリフィル
  useEffect(() => {
    if (lastOfChosen) {
      setSets(String(lastOfChosen.sets ?? 3))
      setReps(String(lastOfChosen.reps ?? 10))
      setWeight(lastOfChosen.weight != null ? String(lastOfChosen.weight) : '')
    }
  }, [lastOfChosen])

  const save = () => {
    if (!chosenName) return
    const s = Math.max(1, Number(sets) || 1)
    dispatch({
      type: 'addEntry',
      habitId: habit.id,
      exercise: chosenName,
      sets: s,
      reps: Number(reps) || undefined,
      weight: Number(weight) || undefined,
      value: s, // 週間ボリューム(総セット数)の集計用
    })
    onLogged()
  }

  return (
    <div className="strength-form">
      {recent.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {recent.slice(0, 6).map((ex) => (
            <button
              key={ex}
              className={`chip${exercise === ex ? ' active' : ''}`}
              onClick={() => setExercise(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
      <select value={exercise} onChange={(e) => setExercise(e.target.value)} aria-label="種目">
        <option value="" disabled>
          種目を選ぶ…
        </option>
        {exerciseCatalog.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.exercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={FREE_INPUT}>その他(自由入力)</option>
      </select>
      {isFree && (
        <input
          placeholder="種目名を入力"
          value={freeName}
          onChange={(e) => setFreeName(e.target.value)}
        />
      )}
      {chosenName && (
        <>
          <div className="strength-inputs">
            <label>
              重量(kg)
              <input
                type="number"
                inputMode="decimal"
                placeholder={bodyweightExercises.has(chosenName) ? '自重' : 'kg'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
            <label>
              回数
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </label>
            <label>
              セット
              <input
                type="number"
                inputMode="numeric"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </label>
          </div>
          {lastOfChosen && (
            <p className="last-record">
              前回: {lastOfChosen.weight != null ? `${lastOfChosen.weight}kg × ` : ''}
              {lastOfChosen.reps ?? '-'}回 × {lastOfChosen.sets ?? '-'}セット({lastOfChosen.date.slice(5).replace('-', '/')})
            </p>
          )}
        </>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="secondary-btn" onClick={onClose}>
          閉じる
        </button>
        <button className="primary-btn" onClick={save} disabled={!chosenName}>
          記録
        </button>
      </div>
    </div>
  )
}

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
  const isStrength = habit.kind === 'strength'
  const todayExercises = new Set(todayEntries.map((e) => e.exercise).filter(Boolean)).size

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
                {isStrength
                  ? `今日 ${todayExercises}種目 ${todayValue}セット`
                  : `今日 ${todayEntries.length}回 ${metricLabel(habit, todayValue)}`}
              </span>
            )}
          </div>
        </div>
        <button
          className={`log-btn${todayEntries.length > 0 ? ' done' : ''}`}
          aria-label={`${habit.name}を記録する`}
          onClick={() =>
            isStrength
              ? setOpen(!open)
              : log(habit.metric === 'none' ? undefined : habit.defaultValue)
          }
        >
          {!isStrength && todayEntries.length > 0 ? '✓' : '+'}
        </button>
      </div>
      {!isStrength && (
        <button className="detail-toggle" onClick={() => setOpen(!open)}>
          {open ? '閉じる' : '詳しく記録する ▸'}
        </button>
      )}
      {open && isStrength && (
        <StrengthLogger
          habit={habit}
          entries={entries}
          onLogged={() => onLogged(habit.id, habit.name)}
          onClose={() => setOpen(false)}
        />
      )}
      {open && !isStrength && (
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
