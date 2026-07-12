/**
 * マルチデバイス同期。
 * GitHubのシークレットGistをストレージにして、全端末が同じgistに
 * マージ済みデータを読み書きする。追加はIDでユニオン、削除は
 * トゥームストーン(deleted*Ids)で伝播、習慣の編集はupdatedAtの
 * 新しい方が勝つ — ので同期の順序が前後しても壊れない。
 */
import type { AppData, Entry, Habit } from '../types'

export interface SyncConfig {
  token: string
  gistId?: string
}

const CFG_KEY = 'logloglog:sync:v1'
const GIST_DESC = 'logloglog habit data (auto-synced)'
const FILE = 'logloglog-data.json'

export const getSyncConfig = (): SyncConfig | null => {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as SyncConfig
      if (cfg.token) return cfg
    }
  } catch {
    // 壊れた設定は未設定扱い
  }
  return null
}

export const setSyncConfig = (cfg: SyncConfig | null) => {
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
  else localStorage.removeItem(CFG_KEY)
  setStatus(cfg ? { state: 'idle', lastSyncedAt: status.lastSyncedAt } : { state: 'off' })
}

/* ---- 状態のpub/sub(設定UIが購読する) ---- */

export interface SyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'error'
  lastSyncedAt?: string
  message?: string
}

let status: SyncStatus = { state: 'off' }
const listeners = new Set<() => void>()

export const subscribeSync = (cb: () => void): (() => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export const getSyncStatus = (): SyncStatus => status

const setStatus = (s: SyncStatus) => {
  status = s
  listeners.forEach((cb) => cb())
}

// 起動時に設定済みならidle表示にする
if (typeof localStorage !== 'undefined' && getSyncConfig()) status = { state: 'idle' }

/* ---- マージ ---- */

export const mergeData = (a: AppData, b: AppData): AppData => {
  const deletedEntryIds = [...new Set([...(a.deletedEntryIds ?? []), ...(b.deletedEntryIds ?? [])])]
  const deletedHabitIds = [...new Set([...(a.deletedHabitIds ?? []), ...(b.deletedHabitIds ?? [])])]

  const ts = (h: Habit) => h.updatedAt ?? h.createdAt
  const habitMap = new Map<string, Habit>()
  for (const h of [...a.habits, ...b.habits]) {
    const cur = habitMap.get(h.id)
    if (!cur || ts(h) > ts(cur)) habitMap.set(h.id, h)
  }
  const habits = [...habitMap.values()].filter((h) => !deletedHabitIds.includes(h.id))
  const habitIds = new Set(habits.map((h) => h.id))

  const entryMap = new Map<string, Entry>()
  for (const e of [...a.entries, ...b.entries]) if (!entryMap.has(e.id)) entryMap.set(e.id, e)
  const deleted = new Set(deletedEntryIds)
  const entries = [...entryMap.values()]
    .filter((e) => !deleted.has(e.id) && habitIds.has(e.habitId))
    .sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1))

  return { version: 1, habits, entries, deletedEntryIds, deletedHabitIds }
}

/* ---- Gist API ---- */

const api = (token: string, path: string, init?: RequestInit) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...(init?.headers ?? {}),
    },
  })

const findOrCreateGist = async (token: string, data: AppData): Promise<string> => {
  const res = await api(token, '/gists?per_page=100')
  if (res.status === 401) throw new Error('トークンが無効です。作り直して貼り直してください')
  if (!res.ok) throw new Error(`同期先の確認に失敗しました (${res.status})`)
  const gists = (await res.json()) as { id: string; description?: string; files?: Record<string, unknown> }[]
  const hit = gists.find((g) => g.description === GIST_DESC || (g.files && FILE in g.files))
  if (hit) return hit.id

  const created = await api(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [FILE]: { content: JSON.stringify(data) } },
    }),
  })
  if (!created.ok)
    throw new Error(`同期先の作成に失敗しました (${created.status})。トークンに「gist」権限があるか確認してください`)
  return ((await created.json()) as { id: string }).id
}

/* ---- 同期本体 ---- */

let lastPushed = ''
let inFlight: Promise<void> | null = null

/**
 * リモートを読んでローカルとマージし、変化があれば双方に書き戻す。
 * apply はマージ結果をローカルストアに反映するコールバック。
 */
export const syncNow = (data: AppData, apply: (d: AppData) => void): Promise<void> => {
  // 多重実行しない(実行中なら同じPromiseを返す)
  if (inFlight) return inFlight
  inFlight = doSync(data, apply).finally(() => {
    inFlight = null
  })
  return inFlight
}

const doSync = async (data: AppData, apply: (d: AppData) => void): Promise<void> => {
  const cfg = getSyncConfig()
  if (!cfg) return
  setStatus({ state: 'syncing', lastSyncedAt: status.lastSyncedAt })
  try {
    let gistId = cfg.gistId
    if (!gistId) {
      gistId = await findOrCreateGist(cfg.token, data)
      setSyncConfig({ ...cfg, gistId })
    }

    // まっさらな端末(記録ゼロ・習慣未編集・削除履歴なし)の初回接続では、
    // ローカルのデフォルト習慣をマージに混ぜず、リモートをそのまま採用する
    const pristine =
      data.entries.length === 0 &&
      (data.deletedEntryIds ?? []).length === 0 &&
      (data.deletedHabitIds ?? []).length === 0 &&
      data.habits.every((h) => h.updatedAt == null)

    let merged = data
    const res = await api(cfg.token, `/gists/${gistId}`)
    if (res.ok) {
      const gist = (await res.json()) as { files?: Record<string, { content?: string }> }
      const content = gist.files?.[FILE]?.content
      if (content) {
        try {
          const remote = JSON.parse(content) as AppData
          if (remote.version === 1) {
            merged = pristine && remote.habits.length > 0 ? remote : mergeData(data, remote)
          }
        } catch {
          // リモートが壊れていたらローカルの内容で書き直す
        }
      }
    } else if (res.status === 404) {
      // gistが手動で削除されていた → 作り直す
      gistId = await findOrCreateGist(cfg.token, data)
      setSyncConfig({ ...cfg, gistId })
    } else if (res.status === 401) {
      throw new Error('トークンが無効です。作り直して貼り直してください')
    } else {
      throw new Error(`同期データの取得に失敗しました (${res.status})`)
    }

    const body = JSON.stringify(merged)
    if (body !== lastPushed) {
      const w = await api(cfg.token, `/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [FILE]: { content: body } } }),
      })
      if (!w.ok) throw new Error(`同期データの保存に失敗しました (${w.status})`)
      lastPushed = body
    }
    if (JSON.stringify(data) !== body) apply(merged)
    setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() })
  } catch (err) {
    setStatus({
      state: 'error',
      lastSyncedAt: status.lastSyncedAt,
      message: err instanceof Error ? err.message : '同期に失敗しました',
    })
  }
}
