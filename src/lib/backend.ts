/**
 * メール同期(Supabase)のバックエンド設定。
 * オーナーが supabase.com で無料プロジェクトを作り、Project URL と anon キーを
 * ここに貼ると「メールで同期」が有効になる(anonキーは公開してよい設計のキー。
 * データ保護はSupabase側のRLSポリシーが担う)。
 *
 * セットアップ手順は README の「メール同期の有効化」を参照。
 */
export const SUPABASE_URL = 'https://ubxbhkjhhbcguxvlrspu.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieGJoa2poaGJjZ3V4dmxyc3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTgxMzgsImV4cCI6MjA5OTQzNDEzOH0.y8nigscs12zSiaXXmPl8zzzhk2RfuswXVR-i8aW1u-8'

export const emailSyncAvailable = (): boolean => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** SupabaseのGoogleプロバイダを有効化済みならtrue(ログインボタンが出る) */
export const GOOGLE_LOGIN_ENABLED = true
