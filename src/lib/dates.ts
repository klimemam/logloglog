/** ローカルタイムゾーンでの日付ユーティリティ(週は月曜はじまり) */
import { localeTag } from './i18n'

export const toDateKey = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = (): string => toDateKey(new Date())

export const addDays = (key: string, n: number): string => {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** その日が属する週の月曜日の日付キー */
export const weekStartKey = (key: string): string => {
  const d = fromDateKey(key)
  const dow = (d.getDay() + 6) % 7 // 月=0 … 日=6
  d.setDate(d.getDate() - dow)
  return toDateKey(d)
}

/** 直近n週の週開始キーを古い順に返す(今週を含む) */
export const recentWeekStarts = (n: number, from: string = todayKey()): string[] => {
  const thisWeek = weekStartKey(from)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(thisWeek, -7 * i))
  return out
}

export const formatDateShort = (key: string): string => {
  const d = fromDateKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export const formatDateLong = (key: string): string =>
  new Intl.DateTimeFormat(localeTag(), {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(fromDateKey(key))

export const nowTime = (): string => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
