/**
 * マルチデバイス同期。
 * ストレージは2方式: GitHubシークレットGist(トークン方式)と、
 * Supabase(メール+パスワード)。どちらも同じマージ規則を使う —
 * 追加はIDでユニオン、削除はトゥームストーン(deleted*Ids)で伝播、
 * 習慣の編集はupdatedAtの新しい方が勝つ。同期の順序が前後しても壊れない。
 */
import type { AppData, Entry, Habit } from '../types'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './backend'

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

export const getSyncConfig = (): SyncConfig | null => {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as Record<string, unknown>
      // 旧形式({token}のみ)はgistとして読む
      if (!cfg.provider && typeof cfg.token === 'string') {
        return {
          provider: 'gist',
          token: cfg.token,
          gistId: typeof cfg.gistId === 'string' ? cfg.gistId : undefined,
        }
      }
      if (cfg.provider === 'gist' && typeof cfg.token === 'string') {
        return cfg as unknown as SyncConfig
      }
      if (cfg.provider === 'supabase' && (cfg.session as SupabaseSession | undefined)?.access_token) {
        return cfg as unknown as SyncConfig
      }
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

if (typeof localStorage !== 'undefined' && getSyncConfig()) status = { state: 'idle' }

/* ===== マージ ===== */

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
  if (res.status === 401) throw new Error('トークンが無効です。作り直して貼り直してください')
  if (!res.ok) throw new Error(`同期先の確認に失敗しました (${res.status})`)
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
    throw new Error(`同期先の作成に失敗しました (${created.status})。トークンに「gist」権限があるか確認してください`)
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
    if (/already registered/i.test(raw)) throw new Error('このメールは登録済みです。「ログイン」を押してください')
    if (/invalid login credentials/i.test(raw)) throw new Error('メールアドレスかパスワードが違います')
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
    setStatus({ state: 'error', message: `Googleログインに失敗しました: ${errDesc}` })
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

/** 期限が近ければリフレッシュし、有効なセッションを返す(設定にも保存) */
const ensureSession = async (cfg: Extract<SyncConfig, { provider: 'supabase' }>): Promise<SupabaseSession> => {
  if (cfg.session.expires_at - Date.now() > 60_000) return cfg.session
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({ refresh_token: cfg.session.refresh_token }),
  })
  const j = (await res.json()) as AuthResponse
  if (!res.ok) throw new Error('セッションの更新に失敗しました。同期を解除して再ログインしてください')
  const session = toSession(j)
  setSyncConfig({ ...cfg, session })
  return session
}

const supabasePull = async (session: SupabaseSession): Promise<string | null> => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_data?select=data&user_id=eq.${session.user_id}`,
    { headers: sbHeaders(session.access_token) },
  )
  if (!res.ok) throw new Error(`同期データの取得に失敗しました (${res.status})`)
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
  if (!res.ok) throw new Error(`同期データの保存に失敗しました (${res.status})`)
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
        if (res.status === 401) throw new Error('トークンが無効です。作り直して貼り直してください')
        throw new Error(`同期データの取得に失敗しました (${res.status})`)
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
        if (!w.ok) throw new Error(`同期データの保存に失敗しました (${w.status})`)
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
      message: err instanceof Error ? err.message : '同期に失敗しました',
    })
  }
}
