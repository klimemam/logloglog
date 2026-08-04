/**
 * マルチデバイス同期。
 * ストレージは2方式: GitHubシークレットGist(トークン方式)と、
 * Supabase(メール+パスワード)。どちらも同じマージ規則を使う —
 * 追加はIDでユニオン、削除はトゥームストーン(deleted*Ids)で伝播、
 * 習慣の編集はupdatedAtの新しい方が勝つ。同期の順序が前後しても壊れない。
 */
import type { AppData, Entry, Habit } from '../types'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './backend'
import { t } from './i18n'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

/* ===== 設定 ===== */

export interface SupabaseSession {
  access_token: string
  refresh_token: string
  /** epoch ms */
  expires_at: number
  user_id: string
}

export type SyncConfig =
  | { provider: 'gist'; token: string; gistId?: string }
  | { provider: 'supabase'; email: string; session: SupabaseSession }

const CFG_KEY = 'logloglog:sync:v1'
const GIST_DESC = 'logloglog habit data (auto-synced)'
const FILE = 'logloglog-data.json'

let memoryConfig: SyncConfig | null = null

export const loadSyncConfig = async (): Promise<void> => {
  try {
    const { value } = await SecureStoragePlugin.get({ key: CFG_KEY })
    if (value) {
      const cfg = JSON.parse(value) as Record<string, unknown>
      if (!cfg.provider && typeof cfg.token === 'string') {
        memoryConfig = {
          provider: 'gist',
          token: cfg.token,
          gistId: typeof cfg.gistId === 'string' ? cfg.gistId : undefined,
        }
      } else if (cfg.provider === 'gist' && typeof cfg.token === 'string') {
        memoryConfig = cfg as unknown as SyncConfig
      } else if (cfg.provider === 'supabase' && (cfg.session as SupabaseSession | undefined)?.access_token) {
        memoryConfig = cfg as unknown as SyncConfig
      }
    }
  } catch {
    // Attempt migration from localStorage if SecureStorage doesn't have it
    try {
      const raw = localStorage.getItem(CFG_KEY)
      if (raw) {
        const cfg = JSON.parse(raw) as Record<string, unknown>
        let migratedConfig: SyncConfig | null = null
        if (!cfg.provider && typeof cfg.token === 'string') {
          migratedConfig = {
            provider: 'gist',
            token: cfg.token,
            gistId: typeof cfg.gistId === 'string' ? cfg.gistId : undefined,
          }
        } else if (cfg.provider === 'gist' && typeof cfg.token === 'string') {
          migratedConfig = cfg as unknown as SyncConfig
        } else if (cfg.provider === 'supabase' && (cfg.session as SupabaseSession | undefined)?.access_token) {
          migratedConfig = cfg as unknown as SyncConfig
        }

        if (migratedConfig) {
          memoryConfig = migratedConfig
          await SecureStoragePlugin.set({ key: CFG_KEY, value: JSON.stringify(migratedConfig) })
          localStorage.removeItem(CFG_KEY) // Migration complete, remove from insecure storage
        }
      }
    } catch {
      // 壊れた設定は未設定扱い
    }
  }

  if (memoryConfig) {
    status = { state: 'idle' }
  }
}

export const getSyncConfig = (): SyncConfig | null => memoryConfig

export const setSyncConfig = (cfg: SyncConfig | null) => {
  // 同期をつなぐ瞬間のローカルデータを自動バックアップしておく。
  // 初回マージで想定外にデータが変わっても、設定の「データ」から復元できる
  if (cfg && !getSyncConfig()) {
    try {
      const raw = localStorage.getItem('logloglog:v1')
      if (raw) {
        localStorage.setItem(
          BACKUP_KEY,
          JSON.stringify({ at: new Date().toISOString(), data: JSON.parse(raw) }),
        )
      }
    } catch {
      // 容量不足などでバックアップできなくても接続自体は続行する
    }
  }
  memoryConfig = cfg
  if (cfg) {
    SecureStoragePlugin.set({ key: CFG_KEY, value: JSON.stringify(cfg) }).catch(() => {})
  } else {
    SecureStoragePlugin.remove({ key: CFG_KEY }).catch(() => {})
  }
  setStatus(cfg ? { state: 'idle', lastSyncedAt: status.lastSyncedAt } : { state: 'off' })
}

const BACKUP_KEY = 'logloglog:backup:v1'

/** 同期接続時に自動保存されたローカルデータのバックアップ(なければnull) */
export const getSyncBackup = (): { at: string; data: AppData } | null => {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (!raw) return null
    const b = JSON.parse(raw) as { at: string; data: AppData }
    if (b?.data?.version === 1 && Array.isArray(b.data.habits)) return b
  } catch {
    // 壊れたバックアップは無いものとして扱う
  }
  return null
}

/* ===== 状態のpub/sub(設定UIが購読する) ===== */

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

// We will update the status once loadSyncConfig completes successfully.

/* ===== マージ ===== */

export const mergeData = (a: AppData, b: AppData): AppData => {
  const deletedEntryIds = [...new Set([...(a.deletedEntryIds ?? []), ...(b.deletedEntryIds ?? [])])]
  const rawDeletedHabitIds = [
    ...new Set([...(a.deletedHabitIds ?? []), ...(b.deletedHabitIds ?? [])]),
  ]

  const ts = (h: Habit) => h.updatedAt ?? h.createdAt
  const habitMap = new Map<string, Habit>()
  for (const h of [...a.habits, ...b.habits]) {
    const cur = habitMap.get(h.id)
    if (!cur || ts(h) > ts(cur)) habitMap.set(h.id, h)
  }

  const entryMap = new Map<string, Entry>()
  for (const e of [...a.entries, ...b.entries]) if (!entryMap.has(e.id)) entryMap.set(e.id, e)
  const deleted = new Set(deletedEntryIds)
  const liveEntries = [...entryMap.values()].filter((e) => !deleted.has(e.id))

  // 削除トゥームストーンがあっても、消されていない「生きた記録」が残っている習慣は復活させる。
  // デフォルト習慣は全端末で同じ固定IDのため、別端末での過去の削除が
  // この端末で新しくつけた記録を巻き添えで消す事故を防ぐ(記録の保全を削除の伝播より優先)。
  // 意図した習慣の削除は、deleteHabitが記録もトゥームストーン化するので正しく伝播する。
  const liveHabitIds = new Set(liveEntries.map((e) => e.habitId))
  const deletedHabitIds = rawDeletedHabitIds.filter(
    (id) => !(liveHabitIds.has(id) && habitMap.has(id)),
  )

  const habits = [...habitMap.values()].filter((h) => !deletedHabitIds.includes(h.id))
  const habitIds = new Set(habits.map((h) => h.id))
  const entries = liveEntries
    .filter((e) => habitIds.has(e.habitId))
    .sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1))

  return { version: 1, habits, entries, deletedEntryIds, deletedHabitIds }
}

const parseRemote = (content: string | null | undefined): AppData | null => {
  if (!content) return null
  try {
    const remote = JSON.parse(content) as AppData
    if (remote.version === 1 && Array.isArray(remote.habits)) return remote
  } catch {
    // 壊れたリモートは無視してローカルで書き直す
  }
  return null
}

/* ===== GitHub Gist プロバイダ ===== */

const gistApi = (token: string, path: string, init?: RequestInit) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...(init?.headers ?? {}),
    },
  })

const findOrCreateGist = async (token: string, data: AppData): Promise<string> => {
  const res = await gistApi(token, '/gists?per_page=100')
  if (res.status === 401) throw new Error(t('トークンが無効です。作り直して貼り直してください'))
  if (!res.ok) throw new Error(t('同期先の確認に失敗しました ({s})', { s: res.status }))
  const gists = (await res.json()) as { id: string; description?: string; files?: Record<string, unknown> }[]
  const hit = gists.find((g) => g.description === GIST_DESC || (g.files && FILE in g.files))
  if (hit) return hit.id

  const created = await gistApi(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [FILE]: { content: JSON.stringify(data) } },
    }),
  })
  if (!created.ok)
    throw new Error(t('同期先の作成に失敗しました ({s})。トークンに「gist」権限があるか確認してください', { s: created.status }))
  return ((await created.json()) as { id: string }).id
}

/* ===== Supabase(メール)プロバイダ ===== */

const sbHeaders = (token?: string) => ({
  apikey: SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

interface AuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { id: string }
  session?: AuthResponse
  msg?: string
  error_description?: string
  message?: string
}

const toSession = (j: AuthResponse): SupabaseSession => {
  const s = j.access_token ? j : j.session
  if (!s?.access_token || !s.refresh_token)
    throw new Error(
      'ログインに失敗しました。新規登録直後の場合、メール確認が必要な設定になっている可能性があります',
    )
  const user_id = s.user?.id ?? j.user?.id
  if (!user_id) throw new Error('ユーザーIDを取得できませんでした')
  return {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: Date.now() + (s.expires_in ?? 3600) * 1000,
    user_id,
  }
}

/** メール+パスワードでログイン/新規登録してセッションを得る */
export const supabaseSignIn = async (
  email: string,
  password: string,
  mode: 'signin' | 'signup',
): Promise<SupabaseSession> => {
  const path = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({ email, password }),
  })
  const j = (await res.json()) as AuthResponse
  if (!res.ok) {
    const raw = j.msg ?? j.error_description ?? j.message ?? `エラー (${res.status})`
    if (/already registered/i.test(raw)) throw new Error(t('このメールは登録済みです。「ログイン」を押してください'))
    if (/invalid login credentials/i.test(raw)) throw new Error(t('メールアドレスかパスワードが違います'))
    throw new Error(raw)
  }
  return toSession(j)
}

/** SupabaseのGoogle OAuth開始URL(認証後 redirectTo にトークン付きで戻される) */
export const googleAuthUrl = (redirectTo: string): string =>
  `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`

/** Googleログインへ遷移する(Web版: 戻り先はこのページ) */
export const startGoogleLogin = () => {
  location.href = googleAuthUrl(location.origin + location.pathname)
}

const decodeJwtPayload = (jwt: string): { sub?: string; email?: string } => {
  const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(b64)) as { sub?: string; email?: string }
}

/**
 * OAuthで戻されたURLフラグメント(access_token=…&refresh_token=…)から
 * セッションを保存する。成功でtrue。エラーはstatusに出す。
 */
export const applyAuthFragment = (fragment: string): boolean => {
  const params = new URLSearchParams(fragment)

  const errDesc = params.get('error_description')
  if (errDesc) {
    setStatus({ state: 'error', message: t('Googleログインに失敗しました: {e}', { e: errDesc }) })
    return false
  }

  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return false
  try {
    const payload = decodeJwtPayload(access_token)
    if (!payload.sub) return false
    setSyncConfig({
      provider: 'supabase',
      email: payload.email ?? 'Googleアカウント',
      session: {
        access_token,
        refresh_token,
        expires_at: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000,
        user_id: payload.sub,
      },
    })
    return true
  } catch {
    return false
  }
}

/** Web版: OAuthリダイレクトで戻ってきたときのURLハッシュを処理し、URLから消す */
export const handleAuthRedirect = (): boolean => {
  const hash = location.hash
  if (!hash || hash.length < 2) return false
  const ok = applyAuthFragment(hash.slice(1))
  if (ok || hash.includes('error_description')) {
    history.replaceState(null, '', location.pathname + location.search)
  }
  return ok
}

/**
 * 期限が近ければリフレッシュし、有効なセッションを返す(設定にも保存)。
 * ログインを継続させるための工夫:
 * - 期限の5分前から前倒しでリフレッシュ(失効ギリギリを避ける)
 * - 別タブが先にリフレッシュ済みかもしれないので、最新の保存値を読み直す
 * - 通信の一時失敗は自動リトライし、再ログインは要求しない。
 *   トークンが本当に無効(400/401/403)なときだけ再ログインを案内する
 */
const ensureSession = async (
  cfg: Extract<SyncConfig, { provider: 'supabase' }>,
): Promise<SupabaseSession> => {
  const latest = getSyncConfig()
  const current = latest?.provider === 'supabase' ? latest : cfg
  if (current.session.expires_at - Date.now() > 5 * 60_000) return current.session

  const refresh = () =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ refresh_token: current.session.refresh_token }),
    })

  let res = await refresh().catch(() => null)
  if (!res || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1500))
    res = await refresh().catch(() => null)
  }
  if (!res) throw new Error(t('同期に失敗しました'))
  const j = (await res.json()) as AuthResponse
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error(t('セッションの更新に失敗しました。同期を解除して再ログインしてください'))
    }
    throw new Error(t('同期に失敗しました'))
  }
  const session = toSession(j)
  setSyncConfig({ ...current, session })
  return session
}

const supabasePull = async (session: SupabaseSession): Promise<string | null> => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?select=data&user_id=eq.${session.user_id}`,
    { headers: sbHeaders(session.access_token) },
  )
  if (!res.ok) throw new Error(t('同期データの取得に失敗しました ({s})', { s: res.status }))
  const rows = (await res.json()) as { data: AppData }[]
  return rows[0] ? JSON.stringify(rows[0].data) : null
}

const supabasePush = async (session: SupabaseSession, body: string): Promise<void> => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
    method: 'POST',
    headers: { ...sbHeaders(session.access_token), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: session.user_id,
      data: JSON.parse(body),
      updated_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(t('同期データの保存に失敗しました ({s})', { s: res.status }))
}

/* ===== 同期本体 ===== */

let lastPushed = ''
let inFlight: Promise<void> | null = null

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
    // プロバイダごとの読み書きを用意する
    let pull: () => Promise<string | null>
    let push: (body: string) => Promise<void>

    if (cfg.provider === 'gist') {
      let gistId = cfg.gistId
      if (!gistId) {
        gistId = await findOrCreateGist(cfg.token, data)
        setSyncConfig({ ...cfg, gistId })
      }
      const id = gistId
      pull = async () => {
        const res = await gistApi(cfg.token, `/gists/${id}`)
        if (res.ok) {
          const gist = (await res.json()) as { files?: Record<string, { content?: string }> }
          return gist.files?.[FILE]?.content ?? null
        }
        if (res.status === 404) return null // 手動削除された → pushで作り直される
        if (res.status === 401) throw new Error(t('トークンが無効です。作り直して貼り直してください'))
        throw new Error(t('同期データの取得に失敗しました ({s})', { s: res.status }))
      }
      push = async (body) => {
        const w = await gistApi(cfg.token, `/gists/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ files: { [FILE]: { content: body } } }),
        })
        if (w.status === 404) {
          // gistが手動で削除されていた → 作り直す
          const newId = await findOrCreateGist(cfg.token, data)
          setSyncConfig({ ...cfg, gistId: newId })
          return
        }
        if (!w.ok) throw new Error(t('同期データの保存に失敗しました ({s})', { s: w.status }))
      }
    } else {
      const session = await ensureSession(cfg)
      pull = () => supabasePull(session)
      push = (body) => supabasePush(session, body)
    }

    // まっさらな端末(記録ゼロ・習慣未編集・削除履歴なし)の初回接続では、
    // ローカルのデフォルト習慣をマージに混ぜず、リモートをそのまま採用する
    const pristine =
      data.entries.length === 0 &&
      (data.deletedEntryIds ?? []).length === 0 &&
      (data.deletedHabitIds ?? []).length === 0 &&
      data.habits.every((h) => h.updatedAt == null)

    const remote = parseRemote(await pull())
    const merged = remote ? (pristine && remote.habits.length > 0 ? remote : mergeData(data, remote)) : data

    const body = JSON.stringify(merged)
    if (body !== lastPushed) {
      await push(body)
      lastPushed = body
    }
    if (JSON.stringify(data) !== body) apply(merged)
    setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() })
  } catch (err) {
    setStatus({
      state: 'error',
      lastSyncedAt: status.lastSyncedAt,
      message: err instanceof Error ? err.message : t('同期に失敗しました'),
    })
  }
}
