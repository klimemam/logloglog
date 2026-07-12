export type MetricType = 'none' | 'distance' | 'duration' | 'reps'

export interface Habit {
  id: string
  name: string
  emoji: string
  /** カテゴリカルパレットのスロット番号 0..7 */
  colorSlot: number
  metric: MetricType
  /** 記録値の単位(km / 分 / 回 など)。metric === 'none' のときは空 */
  unit: string
  /** 週あたりの目標回数 */
  weeklyTarget: number
  /** ワンタップ記録時に入る既定値 */
  defaultValue?: number
  createdAt: string
  archived?: boolean
}

export interface Entry {
  id: string
  habitId: string
  /** ローカル日付 YYYY-MM-DD */
  date: string
  /** ローカル時刻 HH:mm */
  time: string
  value?: number
  note?: string
  createdAt: string
}

export interface AppData {
  version: 1
  habits: Habit[]
  entries: Entry[]
}
