import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Habit } from '../types'
import { formatDateLong, todayKey } from '../lib/dates'
import { aggregateByDay, currentStreak, thisWeekProgress } from '../lib/stats'
import { Sheet } from './Sheet'
import {
  ExercisePicker,
  WorkoutMode,
  loadSession,
  rowsFromLast,
  saveSession,
} from './Workout'
import type { WorkoutSession } from './Workout'

export const seriesVar = (slot: number) => `var(--series-${(slot % 8) + 1})`

const metricLabel = (h: Habit, value: number) =>
  h.metric === 'none' ? '' : `${Number.isInteger(value) ? value : value.toFixed(1)}${h.unit}`

interface ToastState {
  text: string
  /** セットすると「取り消す」でその習慣の直近エントリを削除できる */
  undoHabitId?: string
}

function HabitCard({
  habit,
  activeSession,
  onStrengthTap,
  onLogged,
}: {
  habit: Habit
  activeSession: boolean
  onStrengthTap: (habit: Habit) => void
  onLogged: (toast: ToastState) => void
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
    onLogged({ text: `${habit.name}を記録しました`, undoHabitId: habit.id })
  }

  const wash = `color-mix(in srgb, ${seriesVar(habit.colorSlot)} 13%, transparent)`

  return (
    <div className="card">
      <div className="habit-card">
        <div className="habit-emoji" style={{ background: wash }}>
          {habit.emoji}
        </div>
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
            {activeSession && <span className="in-workout">ワークアウト中</span>}
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
        {/* ボタン自体が「押すと何が起きるか」を語る: ▶開始 / +5km / +✓ */}
        {isStrength ? (
          <button
            className="log-pill"
            aria-label={activeSession ? 'ワークアウトを再開する' : 'ワークアウトを開始する'}
            onClick={() => onStrengthTap(habit)}
          >
            ▶ {activeSession ? '再開' : '開始'}
          </button>
        ) : habit.metric !== 'none' && habit.defaultValue != null ? (
          <button
            className={`log-pill${todayEntries.length > 0 ? ' done' : ''}`}
            aria-label={`${habit.defaultValue}${habit.unit}を記録する`}
            onClick={() => log(habit.defaultValue)}
          >
            +{habit.defaultValue}
            {habit.unit}
          </button>
        ) : (
          <button
            className={`log-btn${todayEntries.length > 0 ? ' done' : ''}`}
            aria-label={`${habit.name}を記録する`}
            onClick={() => log(habit.metric === 'none' ? undefined : habit.defaultValue)}
          >
            {todayEntries.length > 0 ? '✓' : '+'}
          </button>
        )}
      </div>
      {!isStrength && (
        <>
          <button className="detail-toggle" onClick={() => setOpen(true)}>
            詳しく記録する ▸
          </button>
          <Sheet
            open={open}
            title={
              <>
                {habit.emoji} {habit.name}を記録
              </>
            }
            onClose={() => setOpen(false)}
          >
            <div className="form-grid">
              {habit.metric !== 'none' && (
                <label>
                  記録値({habit.unit})
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={habit.unit}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
              )}
              <label>
                メモ(任意)
                <input
                  type="text"
                  placeholder="例: 調子よかった"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button
                className="primary-btn"
                onClick={() => {
                  const v = habit.metric === 'none' ? undefined : Number(value) || undefined
                  log(v, note)
                  setNote('')
                  setOpen(false)
                }}
              >
                記録する
              </button>
            </div>
          </Sheet>
        </>
      )}
    </div>
  )
}

export function HomeView() {
  const { data, dispatch } = useStore()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [session, setSession] = useState<WorkoutSession | null>(loadSession)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [pickerFor, setPickerFor] = useState<Habit | null>(null)

  useEffect(() => {
    saveSession(session)
  }, [session])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const undo = () => {
    if (!toast?.undoHabitId) return
    const latest = [...data.entries]
      .filter((e) => e.habitId === toast.undoHabitId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
    if (latest) dispatch({ type: 'deleteEntry', entryId: latest.id })
    setToast(null)
  }

  const habits = data.habits.filter((h) => !h.archived)
  const sessionHabit = session ? habits.find((h) => h.id === session.habitId) : undefined
  const sessionEntries = session
    ? data.entries.filter((e) => e.habitId === session.habitId)
    : []

  // 筋トレの「+」: セッション中なら再開、なければ種目ピッカー(選んだ瞬間にワークアウトモードへ)
  const onStrengthTap = (habit: Habit) => {
    if (session && session.habitId === habit.id) {
      setWorkoutOpen(true)
    } else {
      setPickerFor(habit)
    }
  }

  const startWorkout = (habit: Habit, exerciseName: string) => {
    const habitEntries = data.entries.filter((e) => e.habitId === habit.id)
    const last = [...habitEntries].reverse().find((e) => e.exercise === exerciseName)
    setSession({
      habitId: habit.id,
      startedAt: new Date().toISOString(),
      exercises: [{ name: exerciseName, rows: rowsFromLast(last) }],
    })
    setWorkoutOpen(true)
  }

  const finishWorkout = () => {
    if (!session) return
    let exCount = 0
    let setCount = 0
    for (const ex of session.exercises) {
      const done = ex.rows
        .filter((r) => r.done)
        .map((r) => ({ weight: Number(r.weight) || undefined, reps: Number(r.reps) || 0 }))
        .filter((s) => s.reps > 0)
      if (!done.length) continue
      exCount += 1
      setCount += done.length
      const weights = done.filter((s) => s.weight != null).map((s) => s.weight!)
      dispatch({
        type: 'addEntry',
        habitId: session.habitId,
        exercise: ex.name,
        setsDetail: done,
        sets: done.length,
        reps: Math.max(...done.map((s) => s.reps)),
        weight: weights.length ? Math.max(...weights) : undefined,
        value: done.length,
      })
    }
    setSession(null)
    setWorkoutOpen(false)
    setToast({ text: `ワークアウトを記録しました 💪(${exCount}種目 ${setCount}セット)` })
  }

  const discardWorkout = () => {
    if (!confirm('このワークアウトを記録せずに破棄しますか?')) return
    setSession(null)
    setWorkoutOpen(false)
  }

  return (
    <>
      <header className="app-header">
        <h1>今日の記録</h1>
        <div className="date">{formatDateLong(todayKey())}</div>
      </header>
      <main className="app-main">
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            activeSession={session?.habitId === h.id}
            onStrengthTap={onStrengthTap}
            onLogged={setToast}
          />
        ))}
        {habits.length === 0 && (
          <p className="empty-note">習慣がありません。「習慣」タブから追加してください。</p>
        )}
      </main>

      {/* 種目を選んだ瞬間にワークアウトモードへ遷移する */}
      <ExercisePicker
        open={pickerFor != null}
        entries={pickerFor ? data.entries.filter((e) => e.habitId === pickerFor.id) : []}
        onPick={(name) => {
          if (pickerFor) startWorkout(pickerFor, name)
        }}
        onClose={() => setPickerFor(null)}
      />

      {workoutOpen && session && sessionHabit && (
        <WorkoutMode
          habit={sessionHabit}
          entries={sessionEntries}
          session={session}
          onChange={setSession}
          onFinish={finishWorkout}
          onMinimize={() => setWorkoutOpen(false)}
          onDiscard={discardWorkout}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undoHabitId && <button onClick={undo}>取り消す</button>}
        </div>
      )}
    </>
  )
}
