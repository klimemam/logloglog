/**
 * アプリのアップデート確認。
 * - ネイティブ(APK)版: GitHub Releasesの最新ビルド番号と自分のversionCodeを比較。
 *   新しければAPKのダウンロードURLへ誘導する(署名が同じなので上書きインストール可)
 * - Web/PWA版: デプロイ済みindex.htmlのアセット名と現在実行中のものを比較。
 *   変わっていればリロードで新版になる
 */
import { App } from '@capacitor/app'
import { isNativeApp } from './backend'

export const APK_URL =
  'https://github.com/klimemam/logloglog/releases/download/android-latest/LogLogLog.apk'
const RELEASE_API = 'https://api.github.com/repos/klimemam/logloglog/releases/tags/android-latest'

export interface UpdateResult {
  available: boolean
  /** 表示用: 現在のバージョン */
  current: string
  /** 表示用: 最新のバージョン(取得できた場合) */
  latest?: string
}

const checkNative = async (): Promise<UpdateResult> => {
  let currentCode = 0
  let current = '不明'
  try {
    const info = await App.getInfo()
    currentCode = Number(info.build) || 0
    current = `v${info.version}`
  } catch {
    // プラグインが使えない環境では0扱い(=常に最新を案内)
  }
  const res = await fetch(RELEASE_API)
  if (!res.ok) throw new Error(`最新バージョンの確認に失敗しました (${res.status})`)
  const rel = (await res.json()) as { name?: string }
  const m = (rel.name ?? '').match(/v(\d+\.\d+\.(\d+))/)
  if (!m) return { available: false, current }
  const latestCode = Number(m[2])
  return { available: latestCode > currentCode, current, latest: `v${m[1]}` }
}

const checkWeb = async (): Promise<UpdateResult> => {
  const currentSrc =
    document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/"]')?.src ?? ''
  const currentName = currentSrc.split('/').pop() ?? ''
  // Service Workerのキャッシュを確実に迂回するためクエリを付ける(sw.js側で素通し)
  const res = await fetch(`./index.html?update-check=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`更新の確認に失敗しました (${res.status})`)
  const html = await res.text()
  const m = html.match(/assets\/(index-[\w-]+\.js)/)
  const latestName = m?.[1] ?? ''
  return {
    available: Boolean(latestName && currentName && latestName !== currentName),
    current: 'Web版',
  }
}

export const checkForUpdate = (): Promise<UpdateResult> =>
  isNativeApp() ? checkNative() : checkWeb()
