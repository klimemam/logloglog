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

/** 今週の目標達成状況 */
export const thisWeekProgress = (entries: Entry[], habit: Habit) => {
  const start = weekStartKey(todayKey())
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

export type Trend = 'up' | 'flat' | 'down' | 'none'

/**
 * レベルアップ傾向: 今週(進行中)を除いた直近4週の負荷を、その前の4週と比べる。
 * 記録値のある習慣は合計値で、ない習慣は回数で比較する。
 */
export const loadTrend = (entries: Entry[], habit: Habit): Trend => {
  const weeks = weeklySeries(
    entries.filter((e) => e.habitId === habit.id),
    9,
  )
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
