import { useEffect, useMemo, useState } from 'react'
import type { Entry, Habit } from '../types'
import { bodyweightExercises, exerciseCatalog } from '../lib/exercises'
import { epley1RM, exerciseRecords, intensityZone, recentExercises } from '../lib/stats'
import { Sheet } from './Sheet'

/* ===== ワークアウトセッション(進行中の状態) ===== */

export interface SessionRow {
  weight: string
  reps: string
  done: boolean
}

export interface SessionExercise {
  name: string
  rows: SessionRow[]
}

export interface WorkoutSession {
  habitId: string
  startedAt: string
  exercises: SessionExercise[]
}

const SESSION_KEY = 'logloglog:session:v1'

export const loadSession = (): WorkoutSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as WorkoutSession
    if (s.habitId && Array.isArray(s.exercises)) return s
  } catch {
    // 壊れたセッションは無視
  }
  return null
}

export const saveSession = (s: WorkoutSession | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ストレージ満杯などは無視
  }
}

/** 前回のエントリから「もう入力されている」セット行を作る(認知負荷を下げる要) */
export const rowsFromLast = (last: Entry | undefined): SessionRow[] => {
  if (last?.setsDetail?.length) {
    return last.setsDetail.map((s) => ({
      weight: s.weight != null ? String(s.weight) : '',
      reps: String(s.reps),
      done: false,
    }))
  }
  if (last) {
    const n = Math.max(1, last.sets ?? 3)
    return Array.from({ length: n }, () => ({
      weight: last.weight != null ? String(last.weight) : '',
      reps: String(last.reps ?? 10),
      done: false,
    }))
  }
  return Array.from({ length: 3 }, () => ({ weight: '', reps: '10', done: false }))
}

const lastSummary = (e: Entry): string => {
  if (e.setsDetail?.length) {
    const first = e.setsDetail[0]
    return `前回 ${first.weight != null ? `${first.weight}kg×` : ''}${first.reps} × ${e.setsDetail.length}セット`
  }
  return `前回 ${e.weight != null ? `${e.weight}kg×` : ''}${e.reps ?? '-'} × ${e.sets ?? '-'}セット`
}

/* ===== 種目ピッカー(下からスライド) ===== */

export function ExercisePicker({
  open,
  entries,
  onPick,
  onClose,
}: {
  open: boolean
  entries: Entry[]
  onPick: (name: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const recent = useMemo(() => recentExercises(entries), [entries])
  const lastByExercise = useMemo(() => {
    const m = new Map<string, Entry>()
    for (const e of entries) if (e.exercise) m.set(e.exercise, e)
    return m
  }, [entries])

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  const pick = (name: string) => {
    onPick(name)
    onClose()
  }

  const match = (name: string) => !q || name.includes(q)
  const catalogNames = new Set(exerciseCatalog.flatMap((g) => g.exercises))

  const Row = ({ name }: { name: string }) => {
    const last = lastByExercise.get(name)
    return (
      <button className="picker-row" onClick={() => pick(name)}>
        <span className="picker-name">{name}</span>
        <span className="picker-hint">{last ? lastSummary(last) : ''}</span>
      </button>
    )
  }

  return (
    <Sheet open={open} title="種目を選ぶ" onClose={onClose}>
      <div className="picker">
        <input
          placeholder="検索 / 新しい種目名を入力"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q.trim() && !catalogNames.has(q.trim()) && !recent.includes(q.trim()) && (
          <button className="picker-row picker-add" onClick={() => pick(q.trim())}>
            <span className="picker-name">「{q.trim()}」を追加</span>
          </button>
        )}
        {recent.filter(match).length > 0 && (
          <div className="picker-group">
            <div className="picker-group-label">最近</div>
            {recent.filter(match).slice(0, 8).map((name) => (
              <Row key={name} name={name} />
            ))}
          </div>
        )}
        {exerciseCatalog.map((g) => {
          const names = g.exercises.filter((n) => match(n) && !recent.includes(n))
          if (!names.length) return null
          return (
            <div key={g.group} className="picker-group">
              <div className="picker-group-label">{g.group}</div>
              {names.map((name) => (
                <Row key={name} name={name} />
              ))}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

/* ===== ワークアウトモード(全画面セッション) ===== */

const fmtElapsed = (startedAt: string): string => {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function WorkoutMode({
  habit,
  entries,
  session,
  onChange,
  onFinish,
  onMinimize,
  onDiscard,
}: {
  habit: Habit
  entries: Entry[]
  session: WorkoutSession
  onChange: (s: WorkoutSession) => void
  onFinish: () => void
  onMinimize: () => void
  onDiscard: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(session.exercises.length === 0)
  const [restDuration, setRestDuration] = useState(90)
  const [restRemain, setRestRemain] = useState<number | null>(null)
  const [, setTick] = useState(0)

  // 経過時間の表示更新
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // 休憩タイマー
  useEffect(() => {
    if (restRemain == null || restRemain <= 0) return
    const t = setTimeout(() => setRestRemain(restRemain - 1), 1000)
    return () => clearTimeout(t)
  }, [restRemain])
  useEffect(() => {
    if (restRemain === 0) {
      navigator.vibrate?.([200, 100, 200])
      const t = setTimeout(() => setRestRemain(null), 3000)
      return () => clearTimeout(t)
    }
  }, [restRemain])

  const update = (fn: (s: WorkoutSession) => WorkoutSession) => onChange(fn(session))

  const addExercise = (name: string) => {
    const last = [...entries].reverse().find((e) => e.exercise === name)
    update((s) => ({ ...s, exercises: [...s.exercises, { name, rows: rowsFromLast(last) }] }))
  }

  const setRow = (ei: number, ri: number, patch: Partial<SessionRow>) =>
    update((s) => ({
      ...s,
      exercises: s.exercises.map((ex, i) =>
        i === ei
          ? { ...ex, rows: ex.rows.map((r, j) => (j === ri ? { ...r, ...patch } : r)) }
          : ex,
      ),
    }))

  const step = (ei: number, ri: number, field: 'weight' | 'reps', delta: number) => {
    const cur = Number(session.exercises[ei].rows[ri][field]) || 0
    const next = Math.max(0, Math.round((cur + delta) * 10) / 10)
    setRow(ei, ri, { [field]: next === 0 && field === 'weight' ? '' : String(next) })
  }

  const toggleDone = (ei: number, ri: number) => {
    const wasDone = session.exercises[ei].rows[ri].done
    setRow(ei, ri, { done: !wasDone })
    if (!wasDone) setRestRemain(restDuration) // セット完了 → 自動で休憩開始
  }

  const doneSets = session.exercises.reduce(
    (n, ex) => n + ex.rows.filter((r) => r.done).length,
    0,
  )

  return (
    <div className="workout">
      <header className="workout-header">
        <button className="workout-minimize" aria-label="ホームに戻る(セッションは保持)" onClick={onMinimize}>
          ∨
        </button>
        <div className="workout-title">
          <span>{habit.emoji} ワークアウト</span>
          <span className="workout-elapsed">{fmtElapsed(session.startedAt)}</span>
        </div>
        <button className="workout-finish" onClick={onFinish} disabled={doneSets === 0}>
          完了
        </button>
      </header>

      {restRemain != null && (
        <div className={`rest-banner${restRemain === 0 ? ' done' : ''}`}>
          {restRemain === 0 ? (
            '休憩おわり!次のセットへ 💪'
          ) : (
            <>
              休憩中 {Math.floor(restRemain / 60)}:{String(restRemain % 60).padStart(2, '0')}
              <button onClick={() => setRestRemain(null)}>スキップ</button>
            </>
          )}
        </div>
      )}

      <div className="workout-body">
        {session.exercises.map((ex, ei) => {
          const bodyweight = bodyweightExercises.has(ex.name)
          const records = exerciseRecords(entries, ex.name)
          return (
            <div key={ei} className="card exercise-card">
              <div className="exercise-head">
                <div>
                  <span className="exercise-name">{ex.name}</span>
                  {records.best1RM != null && (
                    <span className="exercise-best">ベスト1RM {records.best1RM}kg</span>
                  )}
                </div>
                <button
                  className="text-btn danger"
                  onClick={() =>
                    update((s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== ei) }))
                  }
                >
                  削除
                </button>
              </div>
              <div className="set-table">
                <div className="set-row workout-set set-head">
                  <span>セット</span>
                  <span>重量(kg)</span>
                  <span>回数</span>
                  <span />
                </div>
                {ex.rows.map((r, ri) => {
                  // 強度 = 自己ベスト推定1RMに対する重量の割合。ベスト更新見込みならPR表示
                  const w = Number(r.weight) || 0
                  const reps = Number(r.reps) || 0
                  let badge: { text: string; cls: string } | null = null
                  if (w > 0 && records.best1RM != null) {
                    if (reps > 0 && epley1RM(w, reps) > records.best1RM) {
                      badge = { text: 'PR!', cls: 'pr' }
                    } else {
                      const pct = Math.round((w / records.best1RM) * 100)
                      badge = { text: `${pct}%`, cls: intensityZone(pct) }
                    }
                  } else if (bodyweight && reps > 0 && records.bestReps != null) {
                    badge =
                      reps > records.bestReps
                        ? { text: 'PR!', cls: 'pr' }
                        : {
                            text: `${Math.round((reps / records.bestReps) * 100)}%`,
                            cls: intensityZone(Math.round((reps / records.bestReps) * 100)),
                          }
                  }
                  return (
                  <div key={ri} className={`set-row workout-set${r.done ? ' set-done' : ''}`}>
                    <span className="set-no">
                      {ri + 1}
                      {badge && <small className={`intensity ${badge.cls}`}>{badge.text}</small>}
                    </span>
                    <div className="stepper">
                      <button aria-label="重量を減らす" onClick={() => step(ei, ri, 'weight', -2.5)}>
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={bodyweight ? '自重' : 'kg'}
                        value={r.weight}
                        onChange={(e) => setRow(ei, ri, { weight: e.target.value })}
                      />
                      <button aria-label="重量を増やす" onClick={() => step(ei, ri, 'weight', 2.5)}>
                        +
                      </button>
                    </div>
                    <div className="stepper">
                      <button aria-label="回数を減らす" onClick={() => step(ei, ri, 'reps', -1)}>
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={r.reps}
                        onChange={(e) => setRow(ei, ri, { reps: e.target.value })}
                      />
                      <button aria-label="回数を増やす" onClick={() => step(ei, ri, 'reps', 1)}>
                        +
                      </button>
                    </div>
                    <button
                      className={`done-btn${r.done ? ' on' : ''}`}
                      aria-label={`${ri + 1}セット目を${r.done ? '未完了に戻す' : '完了にする'}`}
                      onClick={() => toggleDone(ei, ri)}
                    >
                      ✓
                    </button>
                  </div>
                  )
                })}
                <button
                  className="secondary-btn add-set"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      exercises: s.exercises.map((e2, i) =>
                        i === ei
                          ? {
                              ...e2,
                              rows: [...e2.rows, { ...e2.rows[e2.rows.length - 1], done: false }],
                            }
                          : e2,
                      ),
                    }))
                  }
                >
                  + セットを追加
                </button>
              </div>
            </div>
          )
        })}

        <button className="primary-btn" onClick={() => setPickerOpen(true)}>
          + 種目を追加
        </button>

        <div className="rest-config">
          <span>休憩タイマー:</span>
          {[60, 90, 120].map((s) => (
            <button
              key={s}
              className={`chip${restDuration === s ? ' active' : ''}`}
              onClick={() => setRestDuration(s)}
            >
              {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
            </button>
          ))}
        </div>

        <button className="discard-btn" onClick={onDiscard}>
          記録せずに破棄
        </button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        entries={entries}
        onPick={addExercise}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
