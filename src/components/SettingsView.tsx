import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import { useStore } from '../store'
import type { AppData } from '../types'
import {
  getSyncBackup,
  getSyncConfig,
  getSyncStatus,
  mergeData,
  setSyncConfig,
  startGoogleLogin,
  subscribeSync,
  supabaseSignIn,
  syncNow,
} from '../lib/sync'
import { emailSyncAvailable, GOOGLE_LOGIN_ENABLED, isNativeApp } from '../lib/backend'
import { startNativeGoogleLogin } from '../lib/native-auth'
import { getLocale, locales, setLocale, t } from '../lib/i18n'
import { APK_URL, checkForUpdate } from '../lib/update'
import type { UpdateResult } from '../lib/update'
import { Sheet } from './Sheet'
import { Header } from './Header'
import { appAlert, appConfirm } from './dialog'
import { IconChevronRight } from './icons'

/* ===== 言語 ===== */

function LanguageBody() {
  const current = getLocale()
  return (
    <div className="chip-row" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
      {locales.map((l) => (
        <button
          key={l.code}
          className={`chip${current === l.code ? ' active' : ''}`}
          onClick={() => l.code !== current && setLocale(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/* ===== マルチデバイス同期 ===== */

function SyncBody() {
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
      setAuthError(t('メールアドレスと6文字以上のパスワードを入力してください'))
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
      setAuthError(err instanceof Error ? err.message : t('ログインに失敗しました'))
    } finally {
      setBusy(false)
    }
  }

  const fmtTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (cfg) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="sync-status">
          {st.state === 'syncing' && <span>{t('🔄 同期中…')}</span>}
          {st.state === 'idle' && (
            <span className="ok">
              {t('✅ 同期オン({who})', { who: cfg.provider === 'supabase' ? cfg.email : 'GitHub' })}
              {st.lastSyncedAt && t(' ・ 最終同期 {t}', { t: fmtTime(st.lastSyncedAt) })}
            </span>
          )}
          {st.state === 'error' && <span className="err">⚠️ {st.message}</span>}
        </div>
        <button className="secondary-btn" onClick={() => syncNow(data, apply)}>
          {t('今すぐ同期')}
        </button>
        <button
          className="text-btn danger"
          onClick={async () => {
            if (
              await appConfirm(t('同期を解除しますか?(この端末のデータは残ります)'), {
                danger: true,
                confirmLabel: t('解除'),
              })
            )
              setSyncConfig(null)
          }}
        >
          {t('同期を解除')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        {t('スマホ・PCなど複数の端末で同じ記録を使えます。データは自分専用の保存先に入り、他の人からは見えません。')}
      </p>
      <div className="chip-row" style={{ marginBottom: 0 }}>
        <button className={`chip${method === 'email' ? ' active' : ''}`} onClick={() => setMethod('email')}>
          {t('📧 メール / Google')}
        </button>
        <button className={`chip${method === 'github' ? ' active' : ''}`} onClick={() => setMethod('github')}>
          {t('🐙 GitHubで同期')}
        </button>
      </div>
      {method === 'email' &&
        (emailSyncAvailable() ? (
          <>
            {GOOGLE_LOGIN_ENABLED && (
              <>
                <button
                  className="secondary-btn google-btn"
                  onClick={() => (isNativeApp() ? startNativeGoogleLogin() : startGoogleLogin())}
                >
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
                  {t('Googleでログイン')}
                </button>
                <div className="or-divider">{t('または メールアドレスで')}</div>
              </>
            )}
            <input
              type="email"
              placeholder={t('メールアドレス')}
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder={t('パスワード(6文字以上)')}
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            {authError && (
              <p style={{ fontSize: 12, color: 'var(--series-6)', fontWeight: 600 }}>{authError}</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary-btn" disabled={busy} onClick={() => connectEmail('signup')}>
                {t('新規登録')}
              </button>
              <button className="primary-btn" disabled={busy} onClick={() => connectEmail('signin')}>
                {t('ログイン')}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('他の端末でも同じ方法でログインすれば、記録が自動で同期されます。')}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {t('メール同期は現在準備中です。GitHubでの同期か、下の「引き継ぎコード」を使ってください。')}
          </p>
        ))}
      {method === 'github' && (
        <>
          <ol style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>
              GitHub → Settings → Developer settings → Personal access tokens →{' '}
              <b>Tokens (classic)</b>
            </li>
            <li>{t('スコープは {b} だけにチェックして生成', { b: 'gist' })}</li>
            <li>{t('トークンを下に貼り付け(他の端末でも同じトークンを貼るだけ)')}</li>
          </ol>
          <input
            type="password"
            placeholder={t('ghp_… トークンを貼り付け')}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button className="primary-btn" onClick={connectGithub} disabled={!token.trim()}>
            {t('同期を開始')}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {t('データは自分のGitHubアカウントの非公開Gistに保存されます。トークンはこの端末のブラウザ内にのみ保存されます。')}
          </p>
        </>
      )}
    </div>
  )
}

/* ===== 引き継ぎコード ===== */

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
    throw new Error(t('引き継ぎコードの形式が違います'))
  }
  const parsed = JSON.parse(json) as AppData
  if (parsed.version !== 1 || !Array.isArray(parsed.habits) || !Array.isArray(parsed.entries)) {
    throw new Error(t('引き継ぎコードの内容が壊れています'))
  }
  return parsed
}

/** コード文字列からQRコードSVGを作る(大きすぎる場合はnull) */
const makeQrSvg = (code: string): string | null => {
  try {
    const qr = qrcode(0, 'L')
    qr.addData(code, 'Byte')
    qr.make()
    const svg = qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true })
    return `data:image/svg+xml;base64,${btoa(svg)}`
  } catch {
    return null
  }
}

function TransferBody() {
  const { data, dispatch } = useStore()
  const [outCode, setOutCode] = useState('')
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [inCode, setInCode] = useState('')
  const [message, setMessage] = useState('')

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {t('今のデータをコードにして別の端末へコピーできます(1回きりの転送。自動同期はされません)。')}
      </p>
      <button
        className="secondary-btn"
        onClick={async () => {
          const code = await encodeTransfer(data)
          setOutCode(code)
          setQrSvg(makeQrSvg(code))
          try {
            await navigator.clipboard.writeText(code)
            setMessage(t('コードをコピーしました。別の端末に貼り付けてください'))
          } catch {
            setMessage(t('下のコードを全選択してコピーしてください'))
          }
        }}
      >
        {t('引き継ぎコードを作成')}
      </button>
      {outCode && qrSvg && (
        <>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {t('QRコード(別の端末のカメラで読み取り)')}
          </p>
          <div className="qr-box">
            <img src={qrSvg} alt="QR Code" />
          </div>
        </>
      )}
      {outCode && !qrSvg && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {t('データが大きいためQRコードは使えません。コードをコピーしてください')}
        </p>
      )}
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
        placeholder={t('別の端末で作ったコードをここに貼り付け')}
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
            setMessage(t('取り込みました(既存の記録とマージ済み)'))
          } catch (err) {
            setMessage(err instanceof Error ? err.message : t('読み込みに失敗しました'))
          }
        }}
      >
        {t('コードを取り込む')}
      </button>
      {message && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{message}</p>
      )}
    </div>
  )
}

/* ===== 友達に教える ===== */

function ShareBody() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        {t('このアプリは登録不要・無料で誰でも使えます。リンクを送るだけでOK。相手の記録は相手の端末だけに保存され、あなたのデータとは完全に別です。')}
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
            appAlert(t('リンクをコピーしました。友達に貼り付けて送ってください!'))
          }
        }}
      >
        {t('アプリのリンクを共有')}
      </button>
    </div>
  )
}

/* ===== データ ===== */

function DataBody() {
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
    reader.onload = async () => {
      let parsed: AppData
      try {
        parsed = JSON.parse(String(reader.result)) as AppData
      } catch {
        appAlert(t('ファイルを読み込めませんでした'))
        return
      }

      if (!(parsed.version === 1 && Array.isArray(parsed.habits) && Array.isArray(parsed.entries))) {
        appAlert(t('ファイル形式が正しくありません'))
        return
      }

      const confirmed = await appConfirm(t('現在のデータをインポート内容で置き換えます。よろしいですか?'), {
        danger: true,
        confirmLabel: t('置き換える'),
      })

      if (!confirmed) return

      dispatch({ type: 'import', data: parsed })
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button className="secondary-btn" onClick={exportData}>
        {t('エクスポート(JSON)')}
      </button>
      <button className="secondary-btn" onClick={() => fileRef.current?.click()}>
        {t('インポート')}
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
      {getSyncBackup() && (
        <button
          className="secondary-btn"
          onClick={async () => {
            const backup = getSyncBackup()
            if (!backup) return
            if (
              await appConfirm(
                t('同期接続時({at})に自動保存されたバックアップを今のデータに統合します(上書きではなく足し合わせ)。よろしいですか?', {
                  at: backup.at.slice(0, 16).replace('T', ' '),
                }),
                { confirmLabel: t('復元') },
              )
            ) {
              dispatch({ type: 'import', data: mergeData(data, backup.data) })
              appAlert(t('バックアップを統合しました'))
            }
          }}
        >
          {t('ログイン前のデータを復元')}
        </button>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t('データはこの端末のブラウザ内(+設定した同期先)に保存されます。')}
      </p>
    </div>
  )
}

/* ===== アプリ情報 ===== */

function AboutBody() {
  const [result, setResult] = useState<UpdateResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const check = useCallback(async () => {
    setChecking(true)
    setError('')
    try {
      setResult(await checkForUpdate())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('確認に失敗しました'))
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="sync-status">
        {checking && <span>{t('🔄 アップデートを確認中…')}</span>}
        {!checking && error && <span className="err">⚠️ {error}</span>}
        {!checking && !error && result && (
          <span className={result.available ? 'err' : 'ok'}>
            {result.available
              ? t('🆕 新しいバージョン {v} があります(現在 {c})', { v: result.latest ?? '', c: result.current })
              : t('✅ 最新版です({c})', { c: result.current })}
          </span>
        )}
      </div>
      {result?.available &&
        (isNativeApp() ? (
          <a className="primary-btn" style={{ textAlign: 'center', textDecoration: 'none' }} href={APK_URL}>
            {t('新しいAPKをダウンロード')}
          </a>
        ) : (
          <button className="primary-btn" onClick={() => location.reload()}>
            {t('更新して再読み込み')}
          </button>
        ))}
      <button className="secondary-btn" onClick={check} disabled={checking}>
        {t('アップデートを確認')}
      </button>
      {isNativeApp() && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {t('ダウンロードしたAPKを開くと上書きインストールされます(記録はそのまま残ります)。')}
        </p>
      )}
    </div>
  )
}

/* ===== 設定メイン(グループ化されたリスト) ===== */

type SectionId = 'lang' | 'sync' | 'transfer' | 'share' | 'data' | 'about'

export function SettingsView() {
  const [open, setOpen] = useState<SectionId | null>(null)
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeSync(force), [])

  const cfg = getSyncConfig()
  const currentLocale = locales.find((l) => l.code === getLocale())?.label ?? ''

  const rows: { id: SectionId; emoji: string; label: string; hint?: string }[] = [
    { id: 'lang', emoji: '🌐', label: t('言語'), hint: currentLocale },
    {
      id: 'sync',
      emoji: '☁️',
      label: t('マルチデバイス同期'),
      hint: cfg ? (cfg.provider === 'supabase' ? cfg.email : 'GitHub') : undefined,
    },
    { id: 'transfer', emoji: '📦', label: t('引き継ぎコード(アカウント不要)') },
    { id: 'share', emoji: '💌', label: t('友達に教える') },
    { id: 'data', emoji: '💾', label: t('データ') },
    { id: 'about', emoji: 'ℹ️', label: t('アプリ情報') },
  ]

  const bodies: Record<SectionId, { title: string; body: React.ReactNode }> = {
    lang: { title: t('言語'), body: <LanguageBody /> },
    sync: { title: t('マルチデバイス同期'), body: <SyncBody /> },
    transfer: { title: t('引き継ぎコード(アカウント不要)'), body: <TransferBody /> },
    share: { title: t('友達に教える'), body: <ShareBody /> },
    data: { title: t('データ'), body: <DataBody /> },
    about: { title: t('アプリ情報'), body: <AboutBody /> },
  }

  return (
    <>
      <Header title={t('設定')} subtitle={t('同期・データ管理・共有')} />
      <main className="app-main">
        <div className="card settings-list">
          {rows.map((r) => (
            <button key={r.id} className="settings-row" onClick={() => setOpen(r.id)}>
              <span className="picker-tile" style={{ fontSize: 18 }}>
                {r.emoji}
              </span>
              <span className="settings-row-label">{r.label}</span>
              {r.hint && <span className="settings-row-hint">{r.hint}</span>}
              <IconChevronRight />
            </button>
          ))}
        </div>

        {(Object.keys(bodies) as SectionId[]).map((id) => (
          <Sheet key={id} open={open === id} title={bodies[id].title} onClose={() => setOpen(null)}>
            {bodies[id].body}
          </Sheet>
        ))}
      </main>
    </>
  )
}
