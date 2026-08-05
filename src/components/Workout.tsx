import { useEffect, useMemo, useRef, useState } from 'react'
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
  /**
   * 休憩終了時刻(epoch ms)。セッションに持たせることで、
   * 画面を離れてもリロードしても休憩の残りが復元される
   * (スマホをポケットに入れる=画面離脱、なので必須)
   */
  restEndsAt?: number
}

const SESSION_KEY = 'logloglog:session:v1'
const REST_PREF_KEY = 'logloglog:rest:v1'

/** 休憩の長さは端末の好みとして覚えておく(毎回1:30に戻っていた) */
export const loadRestDuration = (): number => {
  const n = Number(localStorage.getItem(REST_PREF_KEY))
  return [60, 90, 120, 180].includes(n) ? n : 90
}
export const saveRestDuration = (sec: number) => {
  try {
    localStorage.setItem(REST_PREF_KEY, String(sec))
  } catch {
    // 保存できなくても動作は続ける
  }
}

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
  // 記録済みだがカタログに無い種目(自由入力)。「その他」として拾えるようにする
  const customNames = recent.filter((n) => !catalogNames.has(n))

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
            {/* カタログ外の種目は「その他」。チップが無く部位フィルタから消えていた */}
            {customNames.length > 0 && (
              <button
                className={`chip${part === 'その他' ? ' active' : ''}`}
                onClick={() => setPart('その他')}
              >
                {t('その他')}
              </button>
            )}
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
        {(part === 'その他' || (!part && customNames.length > 0 && searching)) &&
          customNames.filter(match).length > 0 && (
            <div className="picker-group">
              <div className="picker-group-label">{t('その他')}</div>
              {customNames.filter(match).map((name) => (
                <Row key={name} name={name} />
              ))}
            </div>
          )}
        {part === 'その他'
          ? null
          : groups.map((g) => {
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
  onFinish: () => void | Promise<void>
  onMinimize: () => void
  onDiscard: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(session.exercises.length === 0)
  const [restDuration, setRestDurationState] = useState(loadRestDuration)
  const [, setTick] = useState(0)
  const buzzedRef = useRef(false)

  const setRestDuration = (sec: number) => {
    setRestDurationState(sec)
    saveRestDuration(sec)
  }

  // 経過時間と休憩残りの表示更新(1秒ごとに再描画)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // 休憩の残り秒。終了時刻から毎回計算するので、画面を離れても正しく続く
  const restRemain =
    session.restEndsAt == null
      ? null
      : Math.max(0, Math.ceil((session.restEndsAt - Date.now()) / 1000))

  const clearRest = () => update((s) => ({ ...s, restEndsAt: undefined }))

  // 0到達で1度だけ振動し、しばらく「休憩終了」を出してから畳む
  useEffect(() => {
    if (restRemain === 0 && !buzzedRef.current) {
      buzzedRef.current = true
      navigator.vibrate?.([200, 100, 200])
    }
    if (restRemain === 0) {
      const t = setTimeout(clearRest, 5000)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // 「✓を付ける」と「休憩を開始する」は必ず1回の更新にまとめる。
    // update() は毎回propsのsessionから計算するため、続けて2回呼ぶと
    // 後の呼び出しが前の変更を捨ててしまう(✓が付かない不具合の原因だった)
    if (!wasDone) buzzedRef.current = false
    update((s) => ({
      ...s,
      exercises: s.exercises.map((ex, i) =>
        i === ei
          ? { ...ex, rows: ex.rows.map((r, j) => (j === ri ? { ...r, done: !wasDone } : r)) }
          : ex,
      ),
      // セット完了 → 自動で休憩開始
      restEndsAt: wasDone ? s.restEndsAt : Date.now() + restDuration * 1000,
    }))
  }

  // ✓していなくても回数が入っていれば「記録できる中身がある」とみなす。
  // 以前は✓が0だと完了ボタンが押せず、入力したセットを保存する手段がなかった
  const recordableSets = session.exercises.reduce(
    (n, ex) => n + ex.rows.filter((r) => r.done || (Number(r.reps) || 0) > 0).length,
    0,
  )

  return (
    <div className="workout">
      <header className="workout-header">
        <button className="workout-minimize" aria-label={t('ホームに戻る(セッションは保持)')} onClick={onMinimize}>
          <IconChevronDown />
        </button>
        <div className="workout-title">
          <span>{habit.emoji} {t('ワークアウト')}</span>
          <span className="workout-elapsed">{fmtElapsed(session.startedAt)}</span>
        </div>
        <button className="workout-finish" onClick={() => void onFinish()} disabled={recordableSets === 0}>
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
              <button className="rest-skip" onClick={clearRest}>{t('スキップ')}</button>
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
                  <span>{t('セット')}{records.best1RM != null && <small className="set-head-note">{t('強度')}</small>}</span>
                  <span>{t('重量(kg)')}</span>
                  <span>{t('回数')}</span>
                  <span />
                </div>
                {ex.rows.map((r, ri) => {
                  // 強度 = 自己ベスト推定1RMに対する重量の割合。ベスト更新見込みならPR表示
                  const w = Number(r.weight) || 0
                  const reps = Number(r.reps) || 0
                  // PR! は「これから狙う値」ではなく実績として出す。
                  // 未実施のセットに先出しされると予告か実績か紛らわしいため、✓した行だけ
                  let badge: { text: string; cls: string; title: string } | null = null
                  const pctTitle = t('自己ベスト推定1RMに対する割合')
                  if (w > 0 && records.best1RM != null) {
                    if (r.done && reps > 0 && epley1RM(w, reps) > records.best1RM) {
                      badge = { text: t('自己ベスト更新'), cls: 'pr', title: t('自己ベスト更新') }
                    } else {
                      const pct = Math.round((w / records.best1RM) * 100)
                      badge = { text: `${pct}%`, cls: intensityZone(pct), title: pctTitle }
                    }
                  } else if (bodyweight && reps > 0 && records.bestReps != null) {
                    const pct = Math.round((reps / records.bestReps) * 100)
                    badge =
                      r.done && reps > records.bestReps
                        ? { text: t('自己ベスト更新'), cls: 'pr', title: t('自己ベスト更新') }
                        : { text: `${pct}%`, cls: intensityZone(pct), title: t('自己ベスト回数に対する割合') }
                  }
                  return (
                  <div key={ri} className={`set-row workout-set${r.done ? ' set-done' : ''}`}>
                    <span className="set-no">
                      {ri + 1}
                      {badge && <small className={`intensity ${badge.cls}`} title={badge.title}>{badge.text}</small>}
                    </span>
                    <div className="stepper">
                      <button aria-label={t('重量を減らす')} onClick={() => step(ei, ri, 'weight', -2.5)}>
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={bodyweight ? t('自重') : 'kg'}
                        value={r.weight}
                        onChange={(e) => setRow(ei, ri, { weight: e.target.value })}
                      />
                      <button aria-label={t('重量を増やす')} onClick={() => step(ei, ri, 'weight', 2.5)}>
                        +
                      </button>
                    </div>
                    <div className="stepper">
                      <button aria-label={t('回数を減らす')} onClick={() => step(ei, ri, 'reps', -1)}>
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={r.reps}
                        onChange={(e) => setRow(ei, ri, { reps: e.target.value })}
                      />
                      <button aria-label={t('回数を増やす')} onClick={() => step(ei, ri, 'reps', 1)}>
                        +
                      </button>
                    </div>
                    <button
                      className={`done-btn${r.done ? ' on' : ''}`}
                      aria-label={r.done ? t('{n}セット目を未完了に戻す', { n: ri + 1 }) : t('{n}セット目を完了にする', { n: ri + 1 })}
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
