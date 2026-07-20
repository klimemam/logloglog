import { useEffect, useMemo, useState } from 'react'
import type { Entry, Habit } from '../types'
import { bodyweightExercises, exerciseCatalog, exerciseInfo } from '../lib/exercises'
import { epley1RM, exerciseRecords, intensityZone, recentExercises } from '../lib/stats'
import { Sheet } from './Sheet'
import { t } from '../lib/i18n'
import { IconChevronDown } from './icons'
import { ExerciseTile } from './exercise-icons'

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
  const first = e.setsDetail?.length ? e.setsDetail[0] : { weight: e.weight, reps: e.reps ?? '-' }
  const sets = e.setsDetail?.length ?? e.sets ?? '-'
  const s = `${first.weight != null ? `${first.weight}kg×` : ''}${first.reps} × ${sets}`
  return t('前回 {s}', { s })
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
  const [part, setPart] = useState<string>('') // '' = 最近/おすすめ表示
  const recent = useMemo(() => recentExercises(entries), [entries])
  const lastByExercise = useMemo(() => {
    const m = new Map<string, Entry>()
    for (const e of entries) if (e.exercise) m.set(e.exercise, e)
    return m
  }, [entries])

  useEffect(() => {
    if (!open) {
      setQ('')
      setPart('')
    }
  }, [open])

  const pick = (name: string) => {
    onPick(name)
    onClose()
  }

  const match = (name: string) => !q || name.includes(q) || t(name).toLowerCase().includes(q.toLowerCase())
  const catalogNames = new Set(exerciseCatalog.flatMap((g) => g.exercises))
  const searching = q.trim().length > 0

  const Row = ({ name }: { name: string }) => {
    const last = lastByExercise.get(name)
    const info = exerciseInfo(name)
    return (
      <button className="picker-row" onClick={() => pick(name)}>
        <ExerciseTile name={name} />
        <span className="picker-main">
          <span className="picker-name">{t(name)}</span>
          <span className="picker-sub">
            {t(info.group)}
            {last ? ` ・ ${lastSummary(last)}` : ''}
          </span>
        </span>
      </button>
    )
  }

  // 表示するグループ: 検索中は全部位からヒットのみ / 部位選択中はその部位 / 既定は最近+全部位
  const groups = exerciseCatalog.filter((g) => (searching || !part ? true : g.group === part))

  return (
    <Sheet open={open} title={t('種目を選ぶ')} onClose={onClose}>
      <div className="picker">
        <input
          placeholder={t('検索 / 新しい種目名を入力')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!searching && (
          <div className="chip-row" style={{ marginBottom: 0 }}>
            <button className={`chip${part === '' ? ' active' : ''}`} onClick={() => setPart('')}>
              {t('すべて')}
            </button>
            {exerciseCatalog.map((g) => (
              <button
                key={g.group}
                className={`chip${part === g.group ? ' active' : ''}`}
                onClick={() => setPart(g.group)}
              >
                {t(g.group)}
              </button>
            ))}
          </div>
        )}
        {searching && q.trim() && !catalogNames.has(q.trim()) && !recent.includes(q.trim()) && (
          <button className="picker-row picker-add" onClick={() => pick(q.trim())}>
            <span className="picker-tile">＋</span>
            <span className="picker-main">
              <span className="picker-name">{t('「{q}」を追加', { q: q.trim() })}</span>
            </span>
          </button>
        )}
        {!part && recent.filter(match).length > 0 && (
          <div className="picker-group">
            <div className="picker-group-label">{t('最近')}</div>
            {recent.filter(match).slice(0, 6).map((name) => (
              <Row key={name} name={name} />
            ))}
          </div>
        )}
        {groups.map((g) => {
          const names = g.exercises.filter((n) => match(n) && (part ? true : !recent.includes(n)))
          if (!names.length) return null
          return (
            <div key={g.group} className="picker-group">
              <div className="picker-group-label">{t(g.group)}</div>
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
          <IconChevronDown />
        </button>
        <div className="workout-title">
          <span>{habit.emoji} {t('ワークアウト')}</span>
          <span className="workout-elapsed">{fmtElapsed(session.startedAt)}</span>
        </div>
        <button className="workout-finish" onClick={onFinish} disabled={doneSets === 0}>
          {t('完了')}
        </button>
      </header>

      {restRemain != null && (
        <div className={`rest-banner${restRemain === 0 ? ' done' : ''}`}>
          <div
            className="rest-progress"
            style={{ width: `${Math.max(0, (restRemain / restDuration) * 100)}%` }}
          />
          {restRemain === 0 ? (
            t('休憩おわり!次のセットへ 💪')
          ) : (
            <>
              {t('休憩中 {t}', { t: `${Math.floor(restRemain / 60)}:${String(restRemain % 60).padStart(2, '0')}` })}
              <button onClick={() => setRestRemain(null)}>{t('スキップ')}</button>
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
                <div className="exercise-title">
                  <ExerciseTile name={ex.name} size={38} />
                  <span className="exercise-name">{t(ex.name)}</span>
                  {records.best1RM != null && (
                    <span className="exercise-best">{t('ベスト1RM {n}kg', { n: records.best1RM })}</span>
                  )}
                </div>
                <button
                  className="text-btn danger"
                  onClick={() =>
                    update((s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== ei) }))
                  }
                >
                  {t('削除')}
                </button>
              </div>
              <div className="set-table">
                <div className="set-row workout-set set-head">
                  <span>{t('セット')}</span>
                  <span>{t('重量(kg)')}</span>
                  <span>{t('回数')}</span>
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
                        placeholder={bodyweight ? t('自重') : 'kg'}
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
                  {t('+ セットを追加')}
                </button>
              </div>
            </div>
          )
        })}

        <button className="primary-btn" onClick={() => setPickerOpen(true)}>
          {t('+ 種目を追加')}
        </button>

        <div className="rest-config">
          <span>{t('休憩タイマー:')}</span>
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
          {t('記録せずに破棄')}
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
