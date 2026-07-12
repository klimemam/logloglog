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

interface SetRow {
  weight: string
  reps: string
}

/** 前回のエントリからセット行のプリフィルを作る(セット詳細がない旧データは代表値で展開) */
const rowsFromEntry = (e: Entry | undefined): SetRow[] => {
  if (e?.setsDetail?.length) {
    return e.setsDetail.map((s) => ({
      weight: s.weight != null ? String(s.weight) : '',
      reps: String(s.reps),
    }))
  }
  if (e) {
    const n = Math.max(1, e.sets ?? 3)
    return Array.from({ length: n }, () => ({
      weight: e.weight != null ? String(e.weight) : '',
      reps: String(e.reps ?? 10),
    }))
  }
  return Array.from({ length: 3 }, () => ({ weight: '', reps: '10' }))
}

/** セット間の休憩タイマー(終了時にバイブレーション) */
function RestTimer() {
  const [remain, setRemain] = useState<number | null>(null)
  useEffect(() => {
    if (remain == null || remain <= 0) return
    const t = setTimeout(() => setRemain(remain - 1), 1000)
    return () => clearTimeout(t)
  }, [remain])
  useEffect(() => {
    if (remain === 0) navigator.vibrate?.([200, 100, 200])
  }, [remain])

  if (remain == null) {
    return (
      <div className="rest-timer">
        <span>休憩:</span>
        {[60, 90, 120].map((s) => (
          <button key={s} className="chip" onClick={() => setRemain(s)}>
            {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="rest-timer">
      <span className={`rest-count${remain === 0 ? ' done' : ''}`}>
        {remain === 0
          ? '休憩おわり! 💪'
          : `残り ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`}
      </span>
      <button className="chip" onClick={() => setRemain(null)}>
        リセット
      </button>
    </div>
  )
}

/**
 * 筋トレの記録フォーム(Burnfit式):
 * セットごとに重量×回数を個別に記録。前回の記録がプリフィルされ、±ボタンで素早く調整できる。
 */
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
  const [rows, setRows] = useState<SetRow[]>(() => rowsFromEntry(lastOfChosen))

  // 種目を切り替えたら前回の記録でセット行を作り直す
  useEffect(() => {
    setRows(rowsFromEntry(lastOfChosen))
  }, [lastOfChosen])

  const bodyweight = bodyweightExercises.has(chosenName)
  const lastRows = lastOfChosen ? rowsFromEntry(lastOfChosen) : []

  const setRow = (i: number, patch: Partial<SetRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const step = (i: number, field: keyof SetRow, delta: number) =>
    setRows((rs) =>
      rs.map((r, j) => {
        if (j !== i) return r
        const cur = Number(r[field]) || 0
        const next = Math.max(0, Math.round((cur + delta) * 10) / 10)
        return { ...r, [field]: next === 0 && field === 'weight' ? '' : String(next) }
      }),
    )

  const save = () => {
    const setsDetail = rows
      .map((r) => ({ weight: Number(r.weight) || undefined, reps: Number(r.reps) || 0 }))
      .filter((s) => s.reps > 0)
    if (!chosenName || setsDetail.length === 0) return
    const weights = setsDetail.filter((s) => s.weight != null).map((s) => s.weight!)
    dispatch({
      type: 'addEntry',
      habitId: habit.id,
      exercise: chosenName,
      setsDetail,
      sets: setsDetail.length,
      reps: Math.max(...setsDetail.map((s) => s.reps)),
      weight: weights.length ? Math.max(...weights) : undefined,
      value: setsDetail.length, // 週間ボリューム(総セット数)の集計用
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
        <div className="set-table">
          <div className="set-row set-head">
            <span>セット</span>
            <span>重量(kg)</span>
            <span>回数</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="set-row">
              <span className="set-no">
                {i + 1}
                {lastRows[i] && (
                  <small>
                    前回 {lastRows[i].weight ? `${lastRows[i].weight}kg×` : ''}
                    {lastRows[i].reps}
                  </small>
                )}
              </span>
              <div className="stepper">
                <button aria-label="重量を減らす" onClick={() => step(i, 'weight', -2.5)}>
                  −
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={bodyweight ? '自重' : 'kg'}
                  value={r.weight}
                  onChange={(e) => setRow(i, { weight: e.target.value })}
                />
                <button aria-label="重量を増やす" onClick={() => step(i, 'weight', 2.5)}>
                  +
                </button>
              </div>
              <div className="stepper">
                <button aria-label="回数を減らす" onClick={() => step(i, 'reps', -1)}>
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={r.reps}
                  onChange={(e) => setRow(i, { reps: e.target.value })}
                />
                <button aria-label="回数を増やす" onClick={() => step(i, 'reps', 1)}>
                  +
                </button>
              </div>
              <button
                className="set-remove"
                aria-label={`${i + 1}セット目を削除`}
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                disabled={rows.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="secondary-btn"
            style={{ padding: 8 }}
            onClick={() => setRows((rs) => [...rs, { ...rs[rs.length - 1] }])}
          >
            + セットを追加
          </button>
        </div>
      )}
      {chosenName && <RestTimer />}
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
