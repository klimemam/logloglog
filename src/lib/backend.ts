/**
 * メール同期(Supabase)のバックエンド設定。
 * オーナーが supabase.com で無料プロジェクトを作り、Project URL と anon キーを
 * ここに貼ると「メールで同期」が有効になる(anonキーは公開してよい設計のキー。
 * データ保護はSupabase側のRLSポリシーが担う)。
 *
 * セットアップ手順は README の「メール同期の有効化」を参照。
 */
export const SUPABASE_URL = 'https://ubxbhkjhhbcguxvlrspu.supabase.co'
export const SUPABASE_ANON_KEY = ''

export const emailSyncAvailable = (): boolean => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
