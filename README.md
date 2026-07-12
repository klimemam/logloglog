# LogLogLog — 習慣ログ

ワークアウトやランニングなど、日々の習慣をワンタップで記録して、
**目標に対して習慣を維持できているか**と**日々のレベルが上がっているか**を可視化するアプリです。

インストール可能な PWA(Progressive Web App)として実装しており、
**iPhone / Android / HarmonyOS / Web** のすべてで1つのコードベースで動作します。

## 機能

- **開いてすぐ記録** — ホーム画面が記録画面。習慣ごとの「+」をタップするだけで記録完了(取り消しトースト付き)。距離・時間・メモを添えた詳細記録も可能
- **筋トレはワークアウトモードで管理** — 「+」で種目ピッカーがスライドアップし(最近の種目+前回の記録つき)、選んだ瞬間にワークアウトモードへ遷移。**前回のセット内容が最初から入っているので、変えるところだけ±ボタンで調整**すればよい(認知負荷が低い)。セットを✓すると休憩タイマー(1:00/1:30/2:00)が自動スタート。「+種目を追加」で次の種目へ。経過時間表示つきで、途中で閉じてもセッションは保持され「▶」で再開できる。「完了」で✓したセットだけがまとめて記録される。成長は種目ごとの**推定1RM**(Epley式)グラフで確認(自重種目は最大回数)
- **どんな習慣でもOK** — 読書(ページ)、100マス計算(タイム)、勉強・瞑想(分)などのプリセットに加え、自由な名前・単位で作成可能。100マス計算のような「値が小さいほど良い」タイム系習慣は週のベストタイムで成長を追跡
- **目標に対する維持の確認** — 習慣ごとに週の目標回数を設定。今週の達成状況、連続記録日数(ストリーク)、直近12週の回数バーチャート+目標ライン、直近15週の記録カレンダー(ヒートマップ)
- **レベルの確認** — 記録を重ねると上がるレベル(XP制)と、直近4週の負荷(距離・時間・総セット数、タイム系はベストタイム)を前の4週と比較する「負荷トレンド」(レベルアップ中 / 維持 / ペースダウン)、週別ボリュームの推移チャート
- **習慣のカスタマイズ** — 名前・絵文字・色・記録する指標(距離/時間/量/筋トレ/なし)・単位・週目標を自由に設定
- **マルチデバイス同期(3方式)** — ①**メール+パスワード**(Supabase。下記の有効化が必要)、②**GitHubシークレットGist**(gistスコープのトークンを貼るだけ)、③**引き継ぎコード**(アカウント不要の1回転送。gzip圧縮したデータをコピペで移す)。①②は自動同期: 追加はIDでマージ、削除はトゥームストーンで伝播、習慣の編集は新しい方が勝つため、同期の順序が前後しても壊れない。オフライン時はローカルに記録され、次の接続時に同期
- **データ管理** — 基本は端末内(localStorage)に保存(同期はオプション)。JSON でエクスポート/インポート
- **オフライン対応** — Service Worker により、初回アクセス後はネットワークなしでも記録できます
- ライト/ダークモード両対応、日本語 UI

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド(dist/ に出力)
npm run preview  # ビルド結果の確認
npm run icons    # PWAアイコンの再生成
```

技術スタック: Vite + React + TypeScript。チャートは依存ライブラリなしの自前 SVG です。

## デプロイ

`npm run build` で生成される `dist/` を任意の静的ホスティング
(GitHub Pages / Cloudflare Pages / Netlify / Vercel など)に置くだけで動きます。
相対パスでビルドしているのでサブディレクトリ配信も可能です。
PWA(ホーム画面への追加・オフライン動作)には **HTTPS 配信が必須**です。

## 各プラットフォームでの使い方

| プラットフォーム | インストール方法 |
|---|---|
| iPhone (Safari) | 共有メニュー →「ホーム画面に追加」 |
| Android (Chrome) | メニュー →「アプリをインストール」 |
| HarmonyOS | ブラウザでアクセスし「デスクトップに追加」(Huawei ブラウザ対応) |
| Web / PC | ブラウザでそのまま利用。Chrome/Edge はアドレスバーのインストールアイコンから |

ネイティブアプリとしてストア配信したくなった場合は、[Capacitor](https://capacitorjs.com/) で
この Web アプリをそのまま iOS / Android にパッケージ化できます(HarmonyOS は
[ArkTS の WebView ラッパー](https://developer.huawei.com/consumer/en/) で同様に可能)。

## メール同期の有効化(オーナー向け・1回だけ)

「メールで同期」はSupabase(無料枠あり)をバックエンドに使います。有効化手順:

1. [supabase.com](https://supabase.com) で無料プロジェクトを作成
2. SQL Editor で以下を実行(データテーブルと「本人しか読み書きできない」RLSポリシー):

   ```sql
   create table public.user_data (
     user_id uuid primary key references auth.users (id) on delete cascade,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table public.user_data enable row level security;
   create policy "own data" on public.user_data
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```

3. Authentication → Sign In / Providers → Email の「**Confirm email**」を**オフ**にする(アプリ内でメール確認なしに登録を完結させるため)
4. Project Settings → API の **Project URL** と **anon public key** を `src/lib/backend.ts` に貼ってデプロイ

anon キーは公開前提のキーで、データ保護は手順2のRLSが担います。未設定の間、アプリでは「メール同期は準備中」と表示され、GitHub同期と引き継ぎコードはそのまま使えます。

## データ形式

エクスポートされる JSON:

```jsonc
{
  "version": 1,
  "habits": [
    {
      "id": "…",
      "name": "ランニング",
      "emoji": "🏃",
      "colorSlot": 1,          // 0..7 のカラーパレット番号
      "kind": "simple",        // simple | strength(筋トレ: 種目×セット×回数×重量)
      "metric": "distance",    // none | distance | duration | reps
      "unit": "km",
      "weeklyTarget": 2,       // 週あたりの目標回数
      "defaultValue": 5,       // ワンタップ記録時の既定値
      "lowerIsBetter": false   // タイム系(100マス計算など)で値が小さいほど良い場合 true
    }
  ],
  "entries": [
    { "id": "…", "habitId": "…", "date": "2026-07-12", "time": "07:30", "value": 5, "note": "" },
    // 筋トレのエントリ(value はセット数 = 週間ボリューム集計用。
    // sets/reps/weight はサマリで、セットごとの実値は setsDetail)
    { "id": "…", "habitId": "…", "date": "2026-07-12", "time": "07:30",
      "exercise": "ベンチプレス",
      "setsDetail": [{ "weight": 60, "reps": 8 }, { "weight": 60, "reps": 8 }, { "weight": 55, "reps": 12 }],
      "sets": 3, "reps": 12, "weight": 60, "value": 3 }
  ]
}
```
