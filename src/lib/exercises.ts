/** 一般的な筋トレ種目のカタログ(部位別)。ここにない種目は自由入力で追加できる */
export interface ExerciseGroup {
  group: string
  emoji: string
  /** カテゴリカルパレットのスロット(部位カラー) */
  colorSlot: number
  exercises: string[]
}

export const exerciseCatalog: ExerciseGroup[] = [
  {
    group: '胸',
    emoji: '🏋️',
    colorSlot: 0,
    exercises: ['ベンチプレス', 'ダンベルプレス', 'インクラインベンチプレス', 'チェストフライ', '腕立て伏せ'],
  },
  {
    group: '背中',
    emoji: '🧗',
    colorSlot: 4,
    exercises: ['デッドリフト', '懸垂', 'ラットプルダウン', 'ベントオーバーロー', 'シーテッドロー'],
  },
  {
    group: '脚',
    emoji: '🦵',
    colorSlot: 1,
    exercises: ['スクワット', 'レッグプレス', 'ブルガリアンスクワット', 'ランジ', 'レッグカール', 'カーフレイズ'],
  },
  {
    group: '肩',
    emoji: '🤸',
    colorSlot: 2,
    exercises: ['ショルダープレス', 'サイドレイズ', 'リアレイズ', 'アップライトロー'],
  },
  {
    group: '腕',
    emoji: '💪',
    colorSlot: 7,
    exercises: ['アームカール', 'ハンマーカール', 'トライセプスエクステンション', 'ディップス'],
  },
  {
    group: '体幹',
    emoji: '🧘',
    colorSlot: 3,
    exercises: ['プランク', 'クランチ', 'レッグレイズ', 'アブローラー'],
  },
]

/** 種目名から部位情報(絵文字・色)を引く。自由入力の種目は「その他」 */
export const exerciseInfo = (name: string): { emoji: string; colorSlot: number; group: string } => {
  for (const g of exerciseCatalog) {
    if (g.exercises.includes(name)) return { emoji: g.emoji, colorSlot: g.colorSlot, group: g.group }
  }
  return { emoji: '⭐', colorSlot: 5, group: 'その他' }
}

/** 自重が基本でweight入力が任意な種目(プレースホルダ表示の切り替えに使用) */
export const bodyweightExercises = new Set([
  '腕立て伏せ',
  '懸垂',
  'ディップス',
  'プランク',
  'クランチ',
  'レッグレイズ',
  'アブローラー',
])
