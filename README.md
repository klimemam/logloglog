# LogLogLog — 習慣ログ

ワークアウトやランニングなど、日々の習慣をワンタップで記録して、
**目標に対して習慣を維持できているか**と**日々のレベルが上がっているか**を可視化するアプリです。

インストール可能な PWA(Progressive Web App)として実装しており、
**iPhone / Android / HarmonyOS / Web** のすべてで1つのコードベースで動作します。

## 機能

- **開いてすぐ記録** — ホーム画面が記録画面。習慣ごとの「+」をタップするだけで記録完了(取り消しトースト付き)。距離・時間・メモを添えた詳細記録も可能
- **目標に対する維持の確認** — 習慣ごとに週の目標回数を設定。今週の達成状況、連続記録日数(ストリーク)、直近12週の回数バーチャート+目標ライン、直近15週の記録カレンダー(ヒートマップ)
- **レベルの確認** — 記録を重ねると上がるレベル(XP制)と、直近4週の負荷(距離・時間)を前の4週と比較する「負荷トレンド」(レベルアップ中 / 維持 / ペースダウン)、週別ボリュームの推移チャート
- **習慣のカスタマイズ** — 名前・絵文字・色・記録する指標(距離/時間/回数/なし)・週目標を自由に設定
- **データ管理** — 端末内(localStorage)にのみ保存。JSON でエクスポート/インポート
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
      "metric": "distance",    // none | distance | duration | reps
      "unit": "km",
      "weeklyTarget": 2,       // 週あたりの目標回数
      "defaultValue": 5        // ワンタップ記録時の既定値
    }
  ],
  "entries": [
    { "id": "…", "habitId": "…", "date": "2026-07-12", "time": "07:30", "value": 5, "note": "" }
  ]
}
```
