import type { ReactNode } from 'react'
import { exerciseInfo } from '../lib/exercises'

/**
 * 種目ピクトグラム。
 *
 * 実表示は 32x32 CSS px しかない。細い線画の棒人間は32pxでは潰れて
 * 判別できないことが検証で分かったため、
 *   - 器具のシルエット(バーベル/ダンベル/ベンチ/ケーブル/ホイール)を主役に
 *   - 太いストローク + 塗りつぶし
 *   - 1種目あたり2〜3要素まで
 * という方針で描き直している。人体は「どう構えているか」を示す最小限だけ。
 */

/* ===== 共通パーツ ===== */

/** 頭 */
const Head = ({ x, y, r = 4 }: { x: number; y: number; r?: number }) => (
  <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
)

/** バーベル: 長いシャフト + 大きなプレート2枚(塗り) */
const Barbell = ({ y, x1 = 4, x2 = 44, r = 6 }: { y: number; x1?: number; x2?: number; r?: number }) => (
  <>
    <path d={`M${x1 + r} ${y} H${x2 - r}`} />
    <circle cx={x1 + r * 0.6} cy={y} r={r} fill="currentColor" stroke="none" />
    <circle cx={x2 - r * 0.6} cy={y} r={r} fill="currentColor" stroke="none" />
  </>
)

/** ダンベル: 短いシャフト + 角の重り(バーベルとの差が出るよう角ばらせる) */
const Dumbbell = ({
  x,
  y,
  vertical = false,
  s = 1,
}: {
  x: number
  y: number
  vertical?: boolean
  s?: number
}) => {
  const L = 5 * s
  const W = 3.2 * s
  const H = 7 * s
  return vertical ? (
    <>
      <path d={`M${x} ${y - L} V${y + L}`} />
      <rect x={x - H / 2} y={y - L - W} width={H} height={W} fill="currentColor" stroke="none" rx={1} />
      <rect x={x - H / 2} y={y + L} width={H} height={W} fill="currentColor" stroke="none" rx={1} />
    </>
  ) : (
    <>
      <path d={`M${x - L} ${y} H${x + L}`} />
      <rect x={x - L - W} y={y - H / 2} width={W} height={H} fill="currentColor" stroke="none" rx={1} />
      <rect x={x + L} y={y - H / 2} width={W} height={H} fill="currentColor" stroke="none" rx={1} />
    </>
  )
}

/** ベンチ: 厚い座面 + 脚 */
const Bench = ({ y, x1 = 8, x2 = 40 }: { y: number; x1?: number; x2?: number }) => (
  <>
    <path d={`M${x1} ${y} H${x2}`} strokeWidth={6} strokeLinecap="butt" />
    <path d={`M${x1 + 4} ${y + 3} V${y + 8} M${x2 - 4} ${y + 3} V${y + 8}`} />
  </>
)

/** 床 */
const Floor = ({ y = 43 }: { y?: number }) => <path d={`M4 ${y} H44`} />

/** ケーブル/マシンの支柱(上から引く器具の目印) */
const Cable = ({ x, y1, y2 }: { x: number; y1: number; y2: number }) => (
  <path d={`M${x} ${y1} V${y2}`} strokeDasharray="3 3" />
)

const ICONS: Record<string, ReactNode> = {
  /* ===== 胸: ベンチが主役 ===== */
  ベンチプレス: (
    <>
      <Bench y={32} />
      <Head x={36} y={26} />
      <Barbell y={14} />
      <path d="M20 27 V19 M30 27 V19" />
    </>
  ),
  ダンベルプレス: (
    <>
      <Bench y={32} />
      <Head x={36} y={26} />
      {/* 左右で高さをずらす = 34pxでも「2つに分かれている」と分かる輪郭差。
          重りの丸/角の違いは実サイズで消えるため高さで勝負する */}
      <Dumbbell x={12} y={20} />
      <Dumbbell x={32} y={9} />
      <path d="M18 27 L14 24 M28 27 L30 13" />
    </>
  ),
  インクラインベンチプレス: (
    <>
      {/* 斜めのベンチ */}
      <path d="M8 40 L30 22" strokeWidth={6} strokeLinecap="butt" />
      <path d="M11 41 V44 M28 27 V44" />
      <Head x={34} y={19} />
      <Barbell y={9} x1={10} x2={44} r={5} />
      <path d="M24 24 V15 M31 22 V15" />
    </>
  ),
  チェストフライ: (
    <>
      {/* 胸カテゴリの他とシルエット系統を変える: 胸前で閉じるV字(真上から見た腕) */}
      <Head x={24} y={38} />
      <path d="M24 33 L10 14 M24 33 L38 14" strokeWidth={4.4} />
      <Dumbbell x={9} y={11} s={0.9} />
      <Dumbbell x={39} y={11} s={0.9} />
      <path d="M15 24 Q24 18 33 24" />
    </>
  ),
  腕立て伏せ: (
    <>
      <Floor />
      {/* 器具なし・体は床と平行に近い一直線 */}
      <path d="M10 38 L34 28" strokeWidth={5} />
      <path d="M14 38 V43 M31 30 V43" />
      <Head x={38} y={26} />
    </>
  ),

  /* ===== 背中 ===== */
  デッドリフト: (
    <>
      <Floor />
      {/* プレートが床に接している = デッドリフトの決定的な形 */}
      <Barbell y={34} x1={6} x2={42} r={8} />
      <Head x={30} y={13} />
      <path d="M29 17 L24 27 M24 27 V34 M24 27 L18 36" />
    </>
  ),
  懸垂: (
    <>
      {/* 天井のバー(実線)+ ぶら下がり */}
      <path d="M6 8 H42" strokeWidth={5} />
      <path d="M17 10 V19 M31 10 V19" />
      <Head x={24} y={20} />
      <path d="M24 24 V34 M24 34 L19 42 M24 34 L29 42" />
    </>
  ),
  ラットプルダウン: (
    <>
      {/* ケーブル(破線)が上から伸びる = 懸垂との差 */}
      <path d="M10 6 H38" strokeWidth={5} />
      <Cable x={24} y1={8} y2={17} />
      <path d="M14 17 H34" strokeWidth={5} />
      <Head x={24} y={26} />
      <path d="M17 19 L22 29 M31 19 L26 29" />
      <path d="M24 30 V37 M16 40 H32" strokeWidth={5} />
    </>
  ),
  ベントオーバーロー: (
    <>
      <Floor />
      {/* 「く」の字に折れた胴 + 真下に垂れた腕 + 腹の高さのバー */}
      <Head x={37} y={14} r={5} />
      <path d="M34 17 L20 24 M20 24 L18 41" strokeWidth={5} />
      <path d="M26 21 V30" strokeWidth={5} />
      <Barbell y={32} x1={14} x2={38} r={5} />
    </>
  ),
  シーテッドロー: (
    <>
      {/* 3周直しても「H」の記号から動かなかったため設計を変えた。
          原因は人と柱が同じ太さの縦線として並ぶこと。柱(マシン)を描くのをやめ、
          「横に引く」動作そのもの — 肘を体の後ろまで引いた側面姿勢 — で表す
          (ラットプルダウン=縦に引く との対比) */}
      <path d="M6 40 H30" strokeWidth={6} strokeLinecap="butt" />
      <Head x={14} y={16} r={5} />
      <path d="M14 21 V31 M14 31 H32" strokeWidth={5} />
      {/* 前方の手 → 後方へ大きく引いた肘 */}
      <path d="M40 24 H22 L15 18" strokeWidth={5} />
      <circle cx={42} cy={24} r={3.4} fill="currentColor" stroke="none" />
    </>
  ),

  /* ===== 脚 ===== */
  スクワット: (
    <>
      <Floor />
      {/* 肩の高さに担いだバーベル */}
      <Barbell y={13} />
      <Head x={24} y={20} />
      <path d="M24 24 V29 M24 29 L17 35 L17 42 M24 29 L31 35 L31 42" />
    </>
  ),
  レッグプレス: (
    <>
      {/* 押す板(斜めの太線)+ 背もたれに寄りかかった人。
          器具だけにすると記号に見えるので、頭を大きく描いて人体図に戻す */}
      <path d="M30 10 L44 24" strokeWidth={7} strokeLinecap="butt" />
      <path d="M5 22 L13 38" strokeWidth={6} strokeLinecap="butt" />
      <Head x={11} y={17} r={5} />
      <path d="M14 22 L23 29 L34 20" strokeWidth={5} />
    </>
  ),
  ブルガリアンスクワット: (
    <>
      <Floor />
      {/* 後ろ足を乗せたベンチ */}
      <Bench y={32} x1={28} x2={44} />
      <Head x={18} y={12} />
      <path d="M18 16 V26 M18 26 L12 34 L12 42 M18 26 L30 31" />
    </>
  ),
  ランジ: (
    <>
      <Floor />
      {/* 器具なし・前後に大きく開いた脚 */}
      <Head x={24} y={12} />
      <path d="M24 16 V26 M24 26 L33 33 L33 42 M24 26 L14 35 L9 42" />
    </>
  ),
  レッグカール: (
    <>
      {/* 台(太い板)にうつ伏せ + 脛を直角に立てる。
          34pxでは「丸が1つあれば人」の手がかりが強いので頭を大きく出す */}
      <path d="M8 38 H40" strokeWidth={7} strokeLinecap="butt" />
      <Head x={11} y={28} r={5} />
      <path d="M16 29 H31" strokeWidth={5} />
      <path d="M31 29 V11" strokeWidth={5} />
      <path d="M27 10 H37" strokeWidth={5} />
    </>
  ),
  カーフレイズ: (
    <>
      {/* 段差ブロック(塗り)+ 浮いた踵 */}
      <path d="M4 44 H44" />
      <rect x={8} y={36} width={18} height={7} fill="currentColor" stroke="none" rx={1} />
      <Head x={22} y={10} />
      <path d="M22 14 V32 M22 32 L28 36 M22 32 L16 38" />
    </>
  ),

  /* ===== 肩 ===== */
  ショルダープレス: (
    <>
      {/* 頭上に押し上げたバーベル */}
      <Barbell y={9} />
      <Head x={24} y={22} />
      <path d="M24 26 V36 M24 36 L19 44 M24 36 L29 44" />
      <path d="M18 12 L21 20 M30 12 L27 20" />
    </>
  ),
  サイドレイズ: (
    <>
      <Head x={24} y={11} />
      <path d="M24 15 V30 M24 30 L19 42 M24 30 L29 42" />
      {/* 肩の高さで真横に開いた2つのダンベル */}
      <path d="M24 19 H12 M24 19 H36" />
      <Dumbbell x={9} y={19} s={0.8} />
      <Dumbbell x={39} y={19} s={0.8} />
    </>
  ),
  リアレイズ: (
    <>
      {/* サイドレイズが「―」ならリアレイズは「\ /」。腕の角度だけで勝負する */}
      <Head x={24} y={12} />
      <path d="M24 16 V32 M24 32 L19 43 M24 32 L29 43" />
      <path d="M24 20 L11 30 M24 20 L37 30" strokeWidth={4.4} />
      <Dumbbell x={8} y={33} s={0.8} />
      <Dumbbell x={40} y={33} s={0.8} />
    </>
  ),
  アップライトロー: (
    <>
      <Head x={24} y={9} r={4.5} />
      <path d="M24 14 V32 M24 32 L19 43 M24 32 L29 43" />
      {/* 肘を左右へ大きく張り出したΛ形 + 中央の短い横棒。
          中心に寄せると線が重なって黒い塊に潰れていた */}
      <path d="M10 24 L17 15 L24 21 L31 15 L38 24" strokeWidth={4.4} />
      <path d="M17 22 H31" strokeWidth={5} />
    </>
  ),

  /* ===== 腕 ===== */
  アームカール: (
    <>
      <Head x={17} y={10} />
      <path d="M17 14 V32 M17 32 L13 43 M17 32 L22 43" />
      <path d="M17 18 V26 L27 21" />
      {/* 横持ちのダンベル */}
      <Dumbbell x={33} y={20} />
    </>
  ),
  ハンマーカール: (
    <>
      {/* 両腕だが、前腕を垂直に折りたたむ。肩種目(腕を水平に開く大の字)と輪郭を分ける */}
      <Head x={24} y={10} />
      <path d="M24 14 V32 M24 32 L20 43 M24 32 L28 43" />
      <path d="M24 19 H14 V26 M24 19 H34 V26" strokeWidth={4.4} />
      <Dumbbell x={14} y={30} vertical s={0.85} />
      <Dumbbell x={34} y={30} vertical s={0.85} />
    </>
  ),
  トライセプスエクステンション: (
    <>
      <Head x={22} y={26} r={5} />
      <path d="M22 31 V40 M22 40 L18 45 M22 40 L26 45" />
      {/* 頭の丸より上へ大きく折り返した腕 = この種目だけの輪郭 */}
      <path d="M18 22 L20 10 L32 13" strokeWidth={4.4} />
      <Dumbbell x={35} y={15} s={0.9} />
    </>
  ),
  ディップス: (
    <>
      {/* 左右の平行棒(支柱つき)が主役 */}
      <path d="M4 20 H17 M30 20 H44" strokeWidth={5} />
      <path d="M10 22 V42 M38 22 V42" />
      <Head x={24} y={11} />
      <path d="M24 15 V28 M24 17 L15 21 M24 17 L33 21" />
      <path d="M24 28 L19 35 L24 40" />
    </>
  ),

  /* ===== 体幹 ===== */
  プランク: (
    <>
      <Floor />
      {/* 一直線の体 + 前腕を床につく */}
      <path d="M12 32 L34 28" strokeWidth={5} />
      <path d="M14 34 V42 M31 30 V42" />
      <path d="M10 42 H18" strokeWidth={5} />
      <Head x={38} y={27} />
    </>
  ),
  クランチ: (
    <>
      <Floor />
      {/* 膝を立てて上体だけ丸める */}
      <path d="M12 42 L20 30 L28 42" strokeWidth={5} />
      <path d="M22 36 L32 30" />
      <Head x={36} y={28} />
    </>
  ),
  レッグレイズ: (
    <>
      <Floor />
      {/* 胴は床、脚はV字に開いて上へ。倒れたTだと何を表すか読めなかった */}
      <path d="M9 40 H26" strokeWidth={5} />
      <path d="M26 40 L20 14 M26 40 L34 16" strokeWidth={5} />
      <Head x={6} y={36} r={3.5} />
    </>
  ),
  アブローラー: (
    <>
      <Floor />
      {/* 車輪(スポーク付き)が主役 */}
      <circle cx={37} cy={35} r={7} />
      <circle cx={37} cy={35} r={1.8} fill="currentColor" stroke="none" />
      <Head x={13} y={22} />
      <path d="M14 26 L14 38 M10 41 H20 M16 28 L31 33" />
    </>
  ),
}

/** 汎用(自由入力の種目): ダンベル1つ */
const GENERIC = (
  <>
    <Dumbbell x={24} y={24} s={1.5} />
  </>
)

/** グループ代表アイコン */
const GROUP_REP: Record<string, string> = {
  胸: 'ベンチプレス',
  背中: '懸垂',
  脚: 'スクワット',
  肩: 'ショルダープレス',
  腕: 'アームカール',
  体幹: 'プランク',
}

export function ExerciseIcon({ name, size = 30 }: { name: string; size?: number }) {
  const node = ICONS[name] ?? ICONS[GROUP_REP[name] ?? ''] ?? GENERIC
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {node}
    </svg>
  )
}

/** 種目タイル: 部位カラーの淡い背景 + 部位カラーのピクトグラム */
export function ExerciseTile({ name, size = 44 }: { name: string; size?: number }) {
  const info = exerciseInfo(name)
  const color = `var(--series-${(info.colorSlot % 8) + 1})`
  return (
    <span
      className="picker-tile exercise-pict"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        width: size,
        height: size,
      }}
    >
      <ExerciseIcon name={name} size={Math.round(size * 0.78)} />
    </span>
  )
}
