export type MetricType = 'none' | 'distance' | 'duration' | 'reps'

/** simple = 値を1つ記録する習慣 / strength = 種目×セット×回数×重量で記録する筋トレ */
export type HabitKind = 'simple' | 'strength'

export interface Habit {
  id: string
  name: string
  emoji: string
  /** カテゴリカルパレットのスロット番号 0..7 */
  colorSlot: number
  /** 省略時は 'simple'(v1データとの互換) */
  kind?: HabitKind
  metric: MetricType
  /** 記録値の単位(km / 分 / ページ など自由)。metric === 'none' のときは空 */
  unit: string
  /** 週あたりの目標回数 */
  weeklyTarget: number
  /** ワンタップ記録時に入る既定値 */
  defaultValue?: number
  /** タイム系(100マス計算など)で「値が小さいほど良い」場合にtrue */
  lowerIsBetter?: boolean
  createdAt: string
  /** 端末間マージ時の新旧判定に使う(編集のたびに更新) */
  updatedAt?: string
  archived?: boolean
}

/** 1セットの記録。自重種目では weight を省略 */
export interface SetRecord {
  weight?: number
  reps: number
}

export interface Entry {
  id: string
  habitId: string
  /** ローカル日付 YYYY-MM-DD */
  date: string
  /** ローカル時刻 HH:mm */
  time: string
  /** simple: 記録値 / strength: セット数(週間ボリューム集計用) */
  value?: number
  note?: string
  /** 筋トレの種目記録(kind === 'strength' のエントリのみ) */
  exercise?: string
  /** セット数(集計用サマリ)。setsDetail があればその件数と一致する */
  sets?: number
  /** 代表値(最大回数)。セットごとの実値は setsDetail に入る */
  reps?: number
  /** 代表値(最大重量kg)。自重種目では省略 */
  weight?: number
  /** セットごとの記録(Burnfit式: セットごとに重量×回数が異なってよい) */
  setsDetail?: SetRecord[]
  createdAt: string
}

export interface AppData {
  version: 1
  habits: Habit[]
  entries: Entry[]
  /** 削除の同期用トゥームストーン(他端末にもこの削除を伝播させる) */
  deletedEntryIds?: string[]
  deletedHabitIds?: string[]
}
