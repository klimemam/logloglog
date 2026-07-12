/**
 * ネイティブアプリ(Capacitor)でのGoogleログイン。
 * WebView内ではGoogleが認証を拒否するため、外部ブラウザ(カスタムタブ)で
 * 認証し、logloglog://auth ディープリンクでアプリに戻ってトークンを受け取る。
 * このURLはSupabaseの Redirect URLs に登録しておく必要がある。
 */
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { applyAuthFragment, googleAuthUrl } from './sync'

export const NATIVE_AUTH_REDIRECT = 'logloglog://auth'

export const startNativeGoogleLogin = async () => {
  await Browser.open({ url: googleAuthUrl(NATIVE_AUTH_REDIRECT) })
}

/** ディープリンクで戻ってきたトークンを受け取る。onLogin は保存成功時に呼ばれる */
export const initNativeAuthListener = (onLogin: () => void) => {
  App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return
    const i = url.indexOf('#')
    if (i < 0) return
    if (applyAuthFragment(url.slice(i + 1))) {
      Browser.close().catch(() => {
        // Androidではカスタムタブが自動で閉じないことがあるが致命的ではない
      })
      onLogin()
    }
  })
}
