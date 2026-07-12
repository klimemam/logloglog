import { useEffect, useReducer, useRef, useState } from 'react'
import { useStore } from '../store'
import type { AppData } from '../types'
import {
  getSyncConfig,
  getSyncStatus,
  mergeData,
  setSyncConfig,
  startGoogleLogin,
  subscribeSync,
  supabaseSignIn,
  syncNow,
} from '../lib/sync'
import { emailSyncAvailable, GOOGLE_LOGIN_ENABLED } from '../lib/backend'

/** マルチデバイス同期の設定(Google/メール/GitHub Gist) */
function SyncSection() {
  const { data, dispatch } = useStore()
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeSync(force), [])
  const [method, setMethod] = useState<'email' | 'github'>(emailSyncAvailable() ? 'email' : 'github')
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)

  const cfg = getSyncConfig()
  const st = getSyncStatus()
  const apply = (d: AppData) => dispatch({ type: 'import', data: d })

  const connectGithub = () => {
    if (!token.trim()) return
    setSyncConfig({ provider: 'gist', token: token.trim() })
    setToken('')
    syncNow(data, apply)
  }

  const connectEmail = async (mode: 'signin' | 'signup') => {
    if (!email.trim() || password.length < 6) {
      setAuthError('メールアドレスと6文字以上のパスワードを入力してください')
      return
    }
    setBusy(true)
    setAuthError('')
    try {
      const session = await supabaseSignIn(email.trim(), password, mode)
      setSyncConfig({ provider: 'supabase', email: email.trim(), session })
      setPassword('')
      syncNow(data, apply)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const fmtTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <>
      <h2 className="section-title">マルチデバイス同期</h2>
      <div className="card" style={{ display: 'grid', gap: 10 }}>
        {cfg ? (
          <>
            <div className="sync-status">
              {st.state === 'syncing' && <span>🔄 同期中…</span>}
              {st.state === 'idle' && (
                <span className="ok">
                  ✅ 同期オン(
                  {cfg.provider === 'supabase' ? cfg.email : 'GitHub'})
                  {st.lastSyncedAt && ` ・ 最終同期 ${fmtTime(st.lastSyncedAt)}`}
                </span>
              )}
              {st.state === 'error' && <span className="err">⚠️ {st.message}</span>}
            </div>
            <button className="secondary-btn" onClick={() => syncNow(data, apply)}>
              今すぐ同期
            </button>
            <button
              className="text-btn danger"
              onClick={() => {
                if (confirm('同期を解除しますか?(この端末のデータは残ります)')) setSyncConfig(null)
              }}
            >
              同期を解除
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              スマホ・PCなど複数の端末で同じ記録を使えます。データは自分専用の保存先に入り、
              他の人からは見えません。
            </p>
            <div className="chip-row" style={{ marginBottom: 0 }}>
              <button
                className={`chip${method === 'email' ? ' active' : ''}`}
                onClick={() => setMethod('email')}
              >
                📧 メール / Google
              </button>
              <button
                className={`chip${method === 'github' ? ' active' : ''}`}
                onClick={() => setMethod('github')}
              >
                🐙 GitHubで同期
              </button>
            </div>
            {method === 'email' &&
              (emailSyncAvailable() ? (
                <>
                  {GOOGLE_LOGIN_ENABLED && (
                    <>
                      <button className="secondary-btn google-btn" onClick={startGoogleLogin}>
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                          <path
                            fill="#4285F4"
                            d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.44 1.14-4.08 1.14-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.42A11.98 11.98 0 0 0 1.29 6.63l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"
                          />
                        </svg>
                        Googleでログイン
                      </button>
                      <div className="or-divider">または メールアドレスで</div>
                    </>
                  )}
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="パスワード(6文字以上)"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {authError && (
                    <p style={{ fontSize: 12, color: 'var(--series-6)', fontWeight: 600 }}>{authError}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="secondary-btn" disabled={busy} onClick={() => connectEmail('signup')}>
                      新規登録
                    </button>
                    <button className="primary-btn" disabled={busy} onClick={() => connectEmail('signin')}>
                      ログイン
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    他の端末でも同じ方法でログインすれば、記録が自動で同期されます。
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  メール同期は現在準備中です。GitHubでの同期か、下の「引き継ぎコード」を使ってください。
                </p>
              ))}
            {method === 'github' && (
              <>
                <ol style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 18, display: 'grid', gap: 4 }}>
                  <li>
                    GitHub → Settings → Developer settings → Personal access tokens →{' '}
                    <b>Tokens (classic)</b> → Generate new token
                  </li>
                  <li>
                    スコープは <b>gist だけ</b>にチェックして生成
                  </li>
                  <li>トークンを下に貼り付け(他の端末でも同じトークンを貼るだけ)</li>
                </ol>
                <input
                  type="password"
                  placeholder="ghp_… トークンを貼り付け"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button className="primary-btn" onClick={connectGithub} disabled={!token.trim()}>
                  同期を開始
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  データは自分のGitHubアカウントの非公開Gistに保存されます。トークンはこの端末の
                  ブラウザ内にのみ保存されます。
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

/* ===== 引き継ぎコード(アカウント不要の端末間転送) ===== */

const bytesToB64 = (bytes: Uint8Array): string => {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

const b64ToBytes = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

const encodeTransfer = async (data: AppData): Promise<string> => {
  const json = JSON.stringify(data)
  if ('CompressionStream' in window) {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
    const buf = new Uint8Array(await new Response(stream).arrayBuffer())
    return `GZ1.${bytesToB64(buf)}`
  }
  return `B1.${bytesToB64(new TextEncoder().encode(json))}`
}

const decodeTransfer = async (code: string): Promise<AppData> => {
  const trimmed = code.trim()
  let json: string
  if (trimmed.startsWith('GZ1.')) {
    const stream = new Blob([b64ToBytes(trimmed.slice(4)) as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
    json = await new Response(stream).text()
  } else if (trimmed.startsWith('B1.')) {
    json = new TextDecoder().decode(b64ToBytes(trimmed.slice(3)))
  } else {
    throw new Error('引き継ぎコードの形式が違います')
  }
  const parsed = JSON.parse(json) as AppData
  if (parsed.version !== 1 || !Array.isArray(parsed.habits) || !Array.isArray(parsed.entries)) {
    throw new Error('引き継ぎコードの内容が壊れています')
  }
  return parsed
}

function TransferSection() {
  const { data, dispatch } = useStore()
  const [outCode, setOutCode] = useState('')
  const [inCode, setInCode] = useState('')
  const [message, setMessage] = useState('')

  return (
    <>
      <h2 className="section-title">引き継ぎコード(アカウント不要)</h2>
      <div className="card" style={{ display: 'grid', gap: 8 }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          今のデータをコードにして別の端末へコピーできます(1回きりの転送。自動同期はされません)。
        </p>
        <button
          className="secondary-btn"
          onClick={async () => {
            const code = await encodeTransfer(data)
            setOutCode(code)
            try {
              await navigator.clipboard.writeText(code)
              setMessage('コードをコピーしました。別の端末に貼り付けてください')
            } catch {
              setMessage('下のコードを全選択してコピーしてください')
            }
          }}
        >
          引き継ぎコードを作成
        </button>
        {outCode && (
          <textarea
            className="transfer-code"
            readOnly
            value={outCode}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
        <textarea
          className="transfer-code"
          placeholder="別の端末で作ったコードをここに貼り付け"
          value={inCode}
          rows={3}
          onChange={(e) => setInCode(e.target.value)}
        />
        <button
          className="secondary-btn"
          disabled={!inCode.trim()}
          onClick={async () => {
            try {
              const incoming = await decodeTransfer(inCode)
              dispatch({ type: 'import', data: mergeData(data, incoming) })
              setInCode('')
              setMessage('取り込みました(既存の記録とマージ済み)')
            } catch (err) {
              setMessage(err instanceof Error ? err.message : '読み込みに失敗しました')
            }
          }}
        >
          コードを取り込む
        </button>
        {message && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{message}</p>
        )}
      </div>
    </>
  )
}

export function SettingsView() {
  const { data, dispatch } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logloglog-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (parsed.version === 1 && Array.isArray(parsed.habits) && Array.isArray(parsed.entries)) {
          if (confirm('現在のデータをインポート内容で置き換えます。よろしいですか?')) {
            dispatch({ type: 'import', data: parsed })
          }
        } else {
          alert('ファイル形式が正しくありません')
        }
      } catch {
        alert('ファイルを読み込めませんでした')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <header className="app-header">
        <h1>設定</h1>
        <div className="date">同期・データ管理・共有</div>
      </header>
      <main className="app-main">
        <SyncSection />

        <TransferSection />

        <h2 className="section-title">友達に教える</h2>
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            このアプリは登録不要・無料で誰でも使えます。リンクを送るだけでOK。
            相手の記録は相手の端末だけに保存され、あなたのデータとは完全に別です。
          </p>
          <button
            className="primary-btn"
            onClick={async () => {
              const url = 'https://klimemam.github.io/logloglog/'
              const text = '習慣記録アプリ LogLogLog — ワンタップで記録、筋トレはワークアウトモードで。登録不要・無料'
              if (navigator.share) {
                try {
                  await navigator.share({ title: 'LogLogLog — 習慣ログ', text, url })
                } catch {
                  // 共有シートをキャンセルしただけなら何もしない
                }
              } else {
                await navigator.clipboard.writeText(`${text}\n${url}`)
                alert('リンクをコピーしました。友達に貼り付けて送ってください!')
              }
            }}
          >
            アプリのリンクを共有
          </button>
        </div>

        <h2 className="section-title">データ</h2>
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <button className="secondary-btn" onClick={exportData}>
            エクスポート(JSON)
          </button>
          <button className="secondary-btn" onClick={() => fileRef.current?.click()}>
            インポート
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            データはこの端末のブラウザ内(+設定した同期先)に保存されます。
          </p>
        </div>
      </main>
    </>
  )
}
