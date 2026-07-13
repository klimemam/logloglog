import type { Entry, Habit } from '../types'
import { addDays, recentWeekStarts, todayKey, weekStartKey } from './dates'

/** 習慣ごとのエントリを日付キー→件数/合計値に集計 */
export interface DayAgg {
  count: number
  value: number
}

export const aggregateByDay = (entries: Entry[]): Map<string, DayAgg> => {
  const map = new Map<string, DayAgg>()
  for (const e of entries) {
    const cur = map.get(e.date) ?? { count: 0, value: 0 }
    cur.count += 1
    cur.value += e.value ?? 0
    map.set(e.date, cur)
  }
  return map
}

/** 連続記録日数。今日まだ記録がなくても昨日まで続いていればストリークは生きている扱い */
export const currentStreak = (byDay: Map<string, DayAgg>): number => {
  let day = todayKey()
  if (!byDay.has(day)) day = addDays(day, -1)
  let streak = 0
  while (byDay.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

export interface WeekAgg {
  weekStart: string
  count: number
  value: number
}

/** 直近n週の週別集計(古い順、今週を含む) */
export const weeklySeries = (entries: Entry[], n: number): WeekAgg[] => {
  const weeks = recentWeekStarts(n)
  const map = new Map<string, WeekAgg>(weeks.map((w) => [w, { weekStart: w, count: 0, value: 0 }]))
  for (const e of entries) {
    const w = map.get(weekStartKey(e.date))
    if (w) {
      w.count += 1
      w.value += e.value ?? 0
    }
  }
  return weeks.map((w) => map.get(w)!)
}

/** 今週の目標達成状況。やめる習慣は「今週クリアした日数 / 7」 */
export const thisWeekProgress = (entries: Entry[], habit: Habit) => {
  const start = weekStartKey(todayKey())
  if (habit.kind === 'quit') {
    const slips = new Set(entries.filter((e) => e.habitId === habit.id).map((e) => e.date))
    const created = habit.createdAt.slice(0, 10)
    const from = created > start ? created : start
    let count = 0
    for (let d = from; d <= todayKey(); d = addDays(d, 1)) if (!slips.has(d)) count += 1
    return { count, value: count, target: 7, done: count >= 7 }
  }
  let count = 0
  let value = 0
  for (const e of entries) {
    if (e.habitId === habit.id && weekStartKey(e.date) === start) {
      count += 1
      value += e.value ?? 0
    }
  }
  return { count, value, target: habit.weeklyTarget, done: count >= habit.weeklyTarget }
}

/* ===== やめる習慣(禁煙など)。エントリ = やってしまった日(スリップ) ===== */

export interface QuitStats {
  /** いまの継続日数(今日を含む。今日やってしまったら0) */
  current: number
  /** ベスト継続日数 */
  best: number
  /** 開始からのクリア日数の合計(XP計算用) */
  cleanDays: number
}

export const quitStats = (habit: Habit, entries: Entry[]): QuitStats => {
  const slips = new Set(entries.map((e) => e.date))
  const today = todayKey()
  let current = 0
  let best = 0
  let cleanDays = 0
  for (let d = habit.createdAt.slice(0, 10); d <= today; d = addDays(d, 1)) {
    if (slips.has(d)) {
      current = 0
    } else {
      current += 1
      cleanDays += 1
      if (current > best) best = current
    }
  }
  return { current, best, cleanDays }
}

/**
 * XPとレベル。
 * 1回の記録 = 10XP。レベルnに必要な累計XPは 30·n·(n−1)。
 * 序盤は数回でレベルアップし、続けるほど次のレベルが遠くなる。
 */
export const xpForEntries = (entryCount: number): number => entryCount * 10

export const levelFromXp = (xp: number): { level: number; intoLevel: number; needed: number } => {
  let level = 1
  while (30 * (level + 1) * level <= xp) level += 1
  const base = 30 * level * (level - 1)
  const next = 30 * (level + 1) * level
  return { level, intoLevel: xp - base, needed: next - base }
}

/** 週ごとの値の点列(記録がない週は null)。折れ線チャート用 */
export interface WeekPoint {
  weekStart: string
  value: number | null
}

/** タイム系(値が小さいほど良い)習慣の週別ベスト(最小値) */
export const weeklyBestSeries = (entries: Entry[], n: number): WeekPoint[] => {
  const weeks = recentWeekStarts(n)
  const best = new Map<string, number>()
  for (const e of entries) {
    if (e.value == null) continue
    const w = weekStartKey(e.date)
    const cur = best.get(w)
    if (cur == null || e.value < cur) best.set(w, e.value)
  }
  return weeks.map((w) => ({ weekStart: w, value: best.get(w) ?? null }))
}

/** Epley式の推定1RM(その重量・回数から換算した1回挙上できる最大重量) */
export const epley1RM = (weight: number, reps: number): number =>
  Math.round(weight * (1 + reps / 30) * 10) / 10

/** エントリ1件のベスト値: 重量ありは推定1RM、自重は最大回数 */
const entryBest = (e: Entry, byWeight: boolean): number | null => {
  if (e.setsDetail?.length) {
    if (byWeight) {
      const vals = e.setsDetail
        .filter((s) => s.weight != null && s.reps > 0)
        .map((s) => epley1RM(s.weight!, s.reps))
      return vals.length ? Math.max(...vals) : null
    }
    return Math.max(...e.setsDetail.map((s) => s.reps))
  }
  if (byWeight) return e.weight != null ? epley1RM(e.weight, e.reps ?? 1) : null
  return e.reps ?? null
}

/**
 * 筋トレ種目ごとの週別ベスト。重量の記録がある種目は推定1RM(kg)、
 * 自重種目(重量未記録)は最大回数で成長を追う。
 */
export const exerciseWeeklyBest = (
  entries: Entry[],
  exercise: string,
  n: number,
): { points: WeekPoint[]; byWeight: boolean } => {
  const targeted = entries.filter((e) => e.exercise === exercise)
  const byWeight = targeted.some(
    (e) => e.weight != null || e.setsDetail?.some((s) => s.weight != null),
  )
  const weeks = recentWeekStarts(n)
  const best = new Map<string, number>()
  for (const e of targeted) {
    const v = entryBest(e, byWeight)
    if (v == null) continue
    const w = weekStartKey(e.date)
    const cur = best.get(w)
    if (cur == null || v > cur) best.set(w, v)
  }
  return { points: weeks.map((w) => ({ weekStart: w, value: best.get(w) ?? null })), byWeight }
}

/** 種目の自己ベスト(推定1RM・最大重量・最多回数)。強度%とPR判定の基準になる */
export interface ExerciseRecords {
  best1RM: number | null
  bestWeight: number | null
  bestReps: number | null
}

export const exerciseRecords = (entries: Entry[], exercise: string): ExerciseRecords => {
  let best1RM: number | null = null
  let bestWeight: number | null = null
  let bestReps: number | null = null
  for (const e of entries) {
    if (e.exercise !== exercise) continue
    const sets = e.setsDetail?.length
      ? e.setsDetail
      : [{ weight: e.weight, reps: e.reps ?? 0 }]
    for (const s of sets) {
      if (s.reps != null && s.reps > 0 && (bestReps == null || s.reps > bestReps)) bestReps = s.reps
      if (s.weight != null) {
        if (bestWeight == null || s.weight > bestWeight) bestWeight = s.weight
        const rm = epley1RM(s.weight, s.reps || 1)
        if (best1RM == null || rm > best1RM) best1RM = rm
      }
    }
  }
  return { best1RM, bestWeight, bestReps }
}

/** 強度%(自己ベスト推定1RMに対するその重量の割合)の表示ゾーン */
export const intensityZone = (pct: number): 'low' | 'mid' | 'high' | 'max' =>
  pct >= 90 ? 'max' : pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low'

/** 記録された種目を新しい順・重複なしで返す */
export const recentExercises = (entries: Entry[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (let i = entries.length - 1; i >= 0; i--) {
    const ex = entries[i].exercise
    if (ex && !seen.has(ex)) {
      seen.add(ex)
      out.push(ex)
    }
  }
  return out
}

export type Trend = 'up' | 'flat' | 'down' | 'none'

/**
 * レベルアップ傾向: 今週(進行中)を除いた直近4週の負荷を、その前の4週と比べる。
 * 記録値のある習慣は合計値(筋トレは総セット数)、ない習慣は回数で比較する。
 * タイム系(lowerIsBetter)は週別ベストの平均で比較し、縮んでいれば「上昇」。
 */
export const loadTrend = (entries: Entry[], habit: Habit): Trend => {
  const own = entries.filter((e) => e.habitId === habit.id)

  if (habit.lowerIsBetter) {
    const points = weeklyBestSeries(own, 9).slice(0, 8)
    const avg = (ps: WeekPoint[]) => {
      const vs = ps.map((p) => p.value).filter((v): v is number => v != null)
      return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null
    }
    const prior = avg(points.slice(0, 4))
    const recent = avg(points.slice(4, 8))
    if (prior == null || recent == null) return 'none'
    const ratio = recent / prior
    if (ratio <= 0.95) return 'up' // タイム短縮 = レベルアップ
    if (ratio >= 1.05) return 'down'
    return 'flat'
  }

  const weeks = weeklySeries(own, 9)
  const pick = (w: WeekAgg) => (habit.metric === 'none' ? w.count : w.value)
  const recent = weeks.slice(4, 8).reduce((s, w) => s + pick(w), 0)
  const prior = weeks.slice(0, 4).reduce((s, w) => s + pick(w), 0)
  if (prior === 0 && recent === 0) return 'none'
  if (prior === 0) return 'up'
  const ratio = recent / prior
  if (ratio >= 1.1) return 'up'
  if (ratio <= 0.9) return 'down'
  return 'flat'
}

/* ===== デイリーサマリー(習慣×日)と気づき ===== */

export interface MatrixRow {
  habit: Habit
  /** 日別の量(metric=noneは回数、それ以外は合計値)。未記録は0 */
  values: number[]
  /** 正規化用の最大値(最低1) */
  max: number
}

/** 習慣×日のマトリクス(古い順の日付と、習慣ごとの日別量) */
export const dailyHabitMatrix = (
  habits: Habit[],
  entries: Entry[],
  nDays: number,
): { days: string[]; rows: MatrixRow[] } => {
  const days: string[] = []
  let d = addDays(todayKey(), -(nDays - 1))
  for (let i = 0; i < nDays; i++) {
    days.push(d)
    d = addDays(d, 1)
  }
  const today = todayKey()
  const rows = habits.map((h) => {
    // やめる習慣は反転: クリアした日 = 1(良い)、やってしまった日 = -1(赤で表示)
    if (h.kind === 'quit') {
      const slips = new Set(entries.filter((e) => e.habitId === h.id).map((e) => e.date))
      const created = h.createdAt.slice(0, 10)
      const values = days.map((day) =>
        day < created || day > today ? 0 : slips.has(day) ? -1 : 1,
      )
      return { habit: h, values, max: 1 }
    }
    const byDay = new Map<string, number>()
    for (const e of entries) {
      if (e.habitId !== h.id) continue
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + (h.metric === 'none' ? 1 : (e.value ?? 0)))
    }
    const values = days.map((day) => byDay.get(day) ?? 0)
    return { habit: h, values, max: Math.max(1, ...values) }
  })
  return { days, rows }
}

export interface Insight {
  /** 「やった日/やらなかった日」で分ける側の習慣 */
  aHabit: Habit
  /** 量を比較する側の習慣(睡眠時間など) */
  bHabit: Habit
  withAvg: number
  withoutAvg: number
  /** 差の大きさ(標準偏差比)。並べ替え用 */
  score: number
}

/**
 * 「Aをやった日は、Bの量が平均どれだけ違うか」を全ペアで計算し、
 * 差が目立つものを返す。Bが未記録の日は比較から除外する。
 * あくまで相関であり因果ではない(UI側で「参考」と明示する)。
 */
export const habitInsights = (habits: Habit[], entries: Entry[], nDays: number): Insight[] => {
  const { days, rows } = dailyHabitMatrix(habits, entries, nDays)
  const out: Insight[] = []
  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length
  for (const a of rows) {
    for (const b of rows) {
      if (a === b || b.habit.metric === 'none') continue
      const withVals: number[] = []
      const withoutVals: number[] = []
      days.forEach((_, i) => {
        const bv = b.values[i]
        if (bv <= 0) return
        if (a.values[i] > 0) withVals.push(bv)
        else withoutVals.push(bv)
      })
      if (withVals.length < 4 || withoutVals.length < 4) continue
      const all = [...withVals, ...withoutVals]
      const m = avg(all)
      const sd = Math.sqrt(avg(all.map((v) => (v - m) ** 2))) || 1
      const withAvg = avg(withVals)
      const withoutAvg = avg(withoutVals)
      const score = Math.abs(withAvg - withoutAvg) / sd
      if (score >= 0.4) out.push({ aHabit: a.habit, bHabit: b.habit, withAvg, withoutAvg, score })
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 4)
}

/** 直近n日の日別集計(古い順)— ヒートマップ用 */
export const dailySeries = (entries: Entry[], nDays: number): { date: string; count: number }[] => {
  const byDay = aggregateByDay(entries)
  const out: { date: string; count: number }[] = []
  let day = addDays(todayKey(), -(nDays - 1))
  for (let i = 0; i < nDays; i++) {
    out.push({ date: day, count: byDay.get(day)?.count ?? 0 })
    day = addDays(day, 1)
  }
  return out
}
