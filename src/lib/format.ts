import type { Entry } from '../types'
import { t } from './i18n'

/**
 * 筋トレ記録のセット要約。
 * 以前は「最大重量×先頭セットの回数×セット数」(例: 70kg×10×3)と表示していたが、
 * 60×10 / 65×8 / 70×6 を記録しても「70kg×10×3」と出るため事実と食い違っていた。
 * 実際のセットを並べ、多いときは件数と最高重量に畳む。
 */
export const setsSummary = (e: Entry): string => {
  const sets = e.setsDetail?.length ? e.setsDetail : null
  if (!sets) {
    // 旧データ(setsDetailなし)は持っている情報だけで正直に出す
    const parts: string[] = []
    if (e.weight != null) parts.push(`${e.weight}kg`)
    if (e.reps != null) parts.push(t('{n}回', { n: e.reps }))
    if (e.sets != null) parts.push(t('{n}セット', { n: e.sets }))
    return parts.join(' ')
  }
  if (sets.length <= 3) {
    return sets.map((s) => `${s.weight != null ? `${s.weight}kg×` : ''}${s.reps}`).join(' / ')
  }
  const weights = sets.filter((s) => s.weight != null).map((s) => s.weight!)
  return weights.length
    ? t('{n}セット(最高{w}kg)', { n: sets.length, w: Math.max(...weights) })
    : t('{n}セット', { n: sets.length })
}
