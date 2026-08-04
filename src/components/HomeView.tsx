import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Habit } from '../types'
import { formatDateLong, todayKey } from '../lib/dates'
import { aggregateByDay, currentStreak, dailyHabitMatrix, quitStats, thisWeekProgress } from '../lib/stats'
import { Sheet } from './Sheet'
import { Header } from './Header'
import { DayDetailSheet } from './DayDetail'
import { appConfirm } from './dialog'
import { IconChevronRight, IconPlay, IconEdit, IconActivity, IconChart, IconX } from './icons'
import { DailyMatrix } from './charts'
import { t, tName } from '../lib/i18n'
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
  const isStrength = habit.kind === 'strength'
  const isQuit = habit.kind === 'quit'
  // やめる習慣: 記録がないこと自体が成果なので、継続日数はスリップ記録から逆算する
  const streak = isQuit ? quitStats(habit, entries).current : currentStreak(aggregateByDay(entries))
  const week = thisWeekProgress(data.entries, habit)
  const todayExercises = new Set(todayEntries.map((e) => e.exercise).filter(Boolean)).size

  const log = (v?: number, n?: string) => {
    dispatch({ type: 'addEntry', habitId: habit.id, value: v, note: n || undefined })
    onLogged({ text: t('{name}を記録しました', { name: tName(habit.name) }), undoHabitId: habit.id })
  }

  const logSlip = async (n?: string) => {
    if (
      await appConfirm(
        t('「{name}」を今日やってしまった記録をつけますか?継続{n}日はリセットされます', {
          name: tName(habit.name),
          n: streak,
        }),
        { danger: true, confirmLabel: t('記録する') },
      )
    ) {
      log(undefined, n)
      return true
    }
    return false
  }

  const wash = `color-mix(in srgb, ${seriesVar(habit.colorSlot)} 13%, transparent)`

  // カード全面タップ: やめる習慣は誤タップでスリップが付くと致命的なので、詳細シートを開くだけにする
  const mainAction = () =>
    isStrength
      ? onStrengthTap(habit)
      : isQuit
        ? setOpen(true)
        : log(habit.metric === 'none' ? undefined : habit.defaultValue)

  return (
    <div className="card habit-tappable" onClick={mainAction}>
      <div className="habit-card">
        <div className="habit-emoji" style={{ background: wash }}>
          {tName(habit.name).charAt(0)}
        </div>
        <div className="habit-info">
          <div className="habit-name">
            <span className="color-dot" style={{ background: seriesVar(habit.colorSlot) }} />
            {tName(habit.name)}
          </div>
          <div className="habit-sub">
            {/* 目標が多くてもドットが溢れないよう表示は7個まで(数字は正確に出す) */}
            <span className="week-dots" aria-label={t('今週 {n}/{m}回', { n: week.count, m: week.target })}>
              {Array.from({ length: Math.min(7, Math.max(week.target, week.count)) }, (_, i) => (
                <span key={i} className={`dot${i < week.count ? ' filled' : ''}`} />
              ))}
              <span style={{ marginLeft: 4 }}>
                {week.count}/{week.target}
              </span>
            </span>
            {activeSession && <span className="in-workout">{t('ワークアウト中')}</span>}
            {streak > 0 && (
              <span className={`streak${streak >= 3 ? ' hot' : ''}`}>
                {isQuit ? t('🔥 {n}日継続中', { n: streak }) : t('🔥 {n}日連続', { n: streak })}
              </span>
            )}
            {isQuit && todayEntries.length > 0 && (
              <span className="slip-note">{t('今日やってしまった: {n}回', { n: todayEntries.length })}</span>
            )}
            {!isQuit && todayEntries.length > 0 && (
              <span>
                {isStrength
                  ? t('今日 {n}種目 {m}セット', { n: todayExercises, m: todayValue })
                  : t('今日 {n}回 {v}', { n: todayEntries.length, v: metricLabel(habit, todayValue) })}
              </span>
            )}
          </div>
        </div>
        {/* ボタン自体が「押すと何が起きるか」を語る: ▶開始 / +5km / +✓ / やってしまった */}
        {isQuit ? (
          <button
            className="log-pill slip"
            aria-label={t('やってしまった')}
            onClick={(e) => {
              e.stopPropagation()
              void logSlip()
            }}
          >
            {t('やってしまった')}
          </button>
        ) : isStrength ? (
          <button
            className="log-pill"
            aria-label={activeSession ? t('再開') : t('開始')}
            onClick={(e) => { e.stopPropagation(); onStrengthTap(habit) }}
          >
            <IconPlay /> {activeSession ? t('再開') : t('開始')}
          </button>
        ) : habit.metric !== 'none' && habit.defaultValue != null ? (
          <button
            className={`log-pill${todayEntries.length > 0 ? ' done' : ''}`}
            aria-label={`${habit.defaultValue}${habit.unit}を記録する`}
            onClick={(e) => { e.stopPropagation(); log(habit.defaultValue) }}
          >
            +{habit.defaultValue}
            {habit.unit}
          </button>
        ) : (
          <button
            className={`log-btn${todayEntries.length > 0 ? ' done' : ''}`}
            aria-label={`${habit.name}を記録する`}
            onClick={(e) => { e.stopPropagation(); log(habit.metric === 'none' ? undefined : habit.defaultValue) }}
          >
            {todayEntries.length > 0 ? '✓' : '+'}
          </button>
        )}
      </div>
      {!isStrength && (
        <span onClick={(e) => e.stopPropagation()}>
          <button className="detail-toggle" onClick={(e) => { e.stopPropagation(); setOpen(true) }}>
            {t('詳しく記録する')} <IconChevronRight size={12} />
          </button>
          <Sheet
            open={open}
            title={`${tName(habit.name).charAt(0)} ${t('{name}を記録', { name: tName(habit.name) })}`}
            onClose={() => setOpen(false)}
          >
            <div className="form-grid">
              {isQuit && (
                <p className="quit-note">
                  {t('やめる習慣は、何もしなくても継続日数が自動で伸びていきます。やってしまった日だけここで記録してください。')}
                  {streak > 0 && <b> {t('🔥 {n}日継続中', { n: streak })}</b>}
                </p>
              )}
              {habit.metric !== 'none' && !isQuit && (
                <label>
                  {t('記録値({unit})', { unit: habit.unit })}
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
                {t('メモ(任意)')}
                <input
                  type="text"
                  placeholder={isQuit ? t('例: 飲み会でつい1本') : t('例: 調子よかった')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button
                className={`primary-btn${isQuit ? ' dialog-danger' : ''}`}
                onClick={async () => {
                  if (isQuit) {
                    if (await logSlip(note)) {
                      setNote('')
                      setOpen(false)
                    }
                    return
                  }
                  const v = habit.metric === 'none' ? undefined : Number(value) || undefined
                  log(v, note)
                  setNote('')
                  setOpen(false)
                }}
              >
                {isQuit ? t('やってしまったを記録') : t('記録する')}
              </button>
            </div>
          </Sheet>
        </span>
      )}
    </div>
  )
}

const ONBOARD_KEY = 'logloglog:onboarded'

function OnboardingCard() {
  const [open, setOpen] = useState(
    () => !localStorage.getItem(ONBOARD_KEY) && !localStorage.getItem('logloglog:v1'),
  )
  const close = () => {
    localStorage.setItem(ONBOARD_KEY, '1')
    setOpen(false)
  }
  if (!open) return null
  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{t('ようこそ 👋')}</h3>
        <button onClick={close} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
          <IconX />
        </button>
      </div>
      <div className="onboard">
        <div className="onboard-item">
          <span className="onboard-icon"><IconEdit /></span>
          <div>
            <b>{t('開いてすぐ、ワンタップで記録')}</b>
            <p>{t('ホームの「+」を押すだけ。ランニングや読書など、習慣は自由に追加できます。')}</p>
          </div>
        </div>
        <div className="onboard-item">
          <span className="onboard-icon"><IconActivity /></span>
          <div>
            <b>{t('筋トレはワークアウトモード')}</b>
            <p>{t('種目を選ぶと前回のセットが入った状態でスタート。✓するだけで休憩タイマーも動きます。')}</p>
          </div>
        </div>
        <div className="onboard-item">
          <span className="onboard-icon"><IconChart /></span>
          <div>
            <b>{t('続けるほど、成長が見える')}</b>
            <p>{t('週の目標達成・連続記録・推定1RMの伸びを統計タブで確認できます。')}</p>
          </div>
        </div>
        <p className="onboard-note" style={{ marginBottom: 12 }}>
          {t('データはあなたの端末の中だけに保存されます(登録不要・無料)。ホーム画面に追加するとアプリとして使えます。')}
        </p>
        <button className="primary-btn" onClick={close}>
          {t('はじめる')}
        </button>
      </div>
    </div>
  )
}

export function HomeView({ onOpenStats, onOpenHabits }: { onOpenStats?: () => void; onOpenHabits?: () => void }) {
  const { data, dispatch } = useStore()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [session, setSession] = useState<WorkoutSession | null>(loadSession)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [pickerFor, setPickerFor] = useState<Habit | null>(null)
  const [detailDay, setDetailDay] = useState<string | null>(null)

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
  const matrix = dailyHabitMatrix(habits, data.entries, 28)
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
    setToast({ text: t('ワークアウトを記録しました 💪({e}種目 {s}セット)', { e: exCount, s: setCount }) })
  }

  const discardWorkout = async () => {
    if (!(await appConfirm(t('このワークアウトを記録せずに破棄しますか?'), { danger: true, confirmLabel: t('破棄') }))) return
    setSession(null)
    setWorkoutOpen(false)
  }

  return (
    <>
      <Header title={t('今日の記録')} subtitle={formatDateLong(todayKey())} />
      <main className="app-main">
        <OnboardingCard />
        {/* 動線の始点: まず全習慣の状況を俯瞰してから、下で記録する */}
        {habits.length > 0 && (
          <div className="card chart-card home-summary">
            <div className="home-summary-head">
              <h3>{t('デイリーサマリー')}</h3>
              {onOpenStats && (
                <button className="text-btn" onClick={onOpenStats}>
                  {t('詳しく')} <IconChevronRight size={12} />
                </button>
              )}
            </div>
            <DailyMatrix
              rows={matrix.rows}
              days={matrix.days}
              unitOf={(row) => (row.habit.metric === 'none' ? t('回') : row.habit.unit || '')}
              onDayTap={setDetailDay}
            />
          </div>
        )}
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
          <div className="empty-state">
            <span className="empty-emoji">🌱</span>
            <b>{t('まだ習慣がありません')}</b>
            <p>{t('最初の習慣を追加して、今日から記録を始めましょう')}</p>
            {onOpenHabits && (
              <button className="primary-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={onOpenHabits}>
                {t('+ 習慣を追加')}
              </button>
            )}
          </div>
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

      <DayDetailSheet date={detailDay} onClose={() => setDetailDay(null)} />

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undoHabitId && <button onClick={undo}>{t('取り消す')}</button>}
        </div>
      )}
    </>
  )
}
