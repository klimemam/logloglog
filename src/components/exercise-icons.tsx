import type { ReactNode } from 'react'
import { exerciseInfo } from '../lib/exercises'

/**
 * 種目ピクトグラム(Burnfit風)。
 * 48x48の座標系に「棒人間+器具」をストロークで描く。色はcurrentColorを継承し、
 * タイル側で部位カラーを指定する。カタログ外の種目は汎用ダンベルを表示。
 */

/** 頭(塗りつぶし circle)。小さいサイズでも人と分かる要 */
const Head = ({ x, y }: { x: number; y: number }) => (
  <circle cx={x} cy={y} r={3.4} fill="currentColor" stroke="none" />
)

/** ダンベル・ウェイトの点(塗りつぶし) */
const Dot = ({ x, y, r = 2.6 }: { x: number; y: number; r?: number }) => (
  <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
)

/** プレート・ホイール(輪郭のみ) */
const Ring = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <circle cx={x} cy={y} r={r} />
)

const ICONS: Record<string, ReactNode> = {
  /* ===== 胸 ===== */
  ベンチプレス: (
    <>
      {/* ベンチ+脚 */}
      <path d="M8 35 H40 M13 35 V41 M35 35 V41" />
      {/* 仰向けの体と腕、バー+プレート */}
      <path d="M9 29 H33 M22 29 V16 M30 29 V16" />
      <Head x={38} y={29} />
      <path d="M13 16 H43 M17 10 V22 M39 10 V22" />
    </>
  ),
  ダンベルプレス: (
    <>
      <path d="M8 35 H40 M13 35 V41 M35 35 V41" />
      <path d="M9 29 H33 M21 29 V18 M31 29 V18" />
      <Head x={38} y={29} />
      <path d="M16 16 H26 M27 16 H37" />
      <Dot x={16} y={16} r={2.2} />
      <Dot x={26} y={16} r={2.2} />
      <Dot x={36} y={16} r={2.2} />
    </>
  ),
  インクラインベンチプレス: (
    <>
      {/* 斜めのベンチ */}
      <path d="M8 40 L32 26 M14 42 L20 33" />
      <path d="M12 36 L31 25 M24 30 L27 15 M31 27 L33 15" />
      <Head x={36} y={22} />
      <path d="M17 14 H43 M21 8 V20 M39 8 V20" />
    </>
  ),
  チェストフライ: (
    <>
      <path d="M8 35 H40 M13 35 V41 M35 35 V41" />
      <path d="M9 29 H33" />
      <Head x={38} y={29} />
      {/* 腕を左右に開く */}
      <path d="M26 28 L12 15 M26 28 L40 15" />
      <Dot x={11} y={14} />
      <Dot x={41} y={14} />
    </>
  ),
  腕立て伏せ: (
    <>
      <path d="M6 42 H42" />
      <path d="M8 34 L34 25 M31 26 V42" />
      <Head x={38} y={23} />
    </>
  ),

  /* ===== 背中 ===== */
  デッドリフト: (
    <>
      <path d="M6 41 H42" />
      <Ring x={19} y={33} r={6.5} />
      {/* 前傾姿勢でバーを掴む */}
      <path d="M28 41 L28 33 L30 27 L36 19 M35 20 L19 33" />
      <Head x={38} y={16} />
    </>
  ),
  懸垂: (
    <>
      <path d="M8 9 H40" />
      <path d="M18 9 L21 19 M30 9 L27 19" />
      <Head x={24} y={16} />
      <path d="M24 20 V31 M24 31 L20 37 L24 42" />
    </>
  ),
  ラットプルダウン: (
    <>
      <path d="M10 8 H38" />
      <path d="M24 23 L14 9 M24 23 L34 9" />
      <Head x={24} y={19} />
      <path d="M24 23 V35 M24 35 H32 V42 M16 42 H34" />
    </>
  ),
  ベントオーバーロー: (
    <>
      <path d="M6 42 H42" />
      <path d="M16 41 V32 L18 30 L31 23 M29 25 L29 37" />
      <Head x={34} y={21} />
      <Ring x={29} y={37} r={4.6} />
    </>
  ),
  シーテッドロー: (
    <>
      <path d="M6 41 H42" />
      {/* 座って引く。右のバーはフットプレート */}
      <path d="M13 40 L18 26 M13 40 L28 36 L34 39 M35 33 V42" />
      <Head x={19} y={22} />
      <path d="M18 28 L29 30 M31 26 V33" />
    </>
  ),

  /* ===== 脚 ===== */
  スクワット: (
    <>
      {/* 担いだバー+プレート */}
      <path d="M8 18 H38 M12 12 V24 M34 12 V24" />
      <Head x={22} y={13} />
      <path d="M22 18 L20 28 L29 31 L26 41 M20 28 L26 33 L22 42" />
    </>
  ),
  レッグプレス: (
    <>
      {/* 斜めのシートに座り、プレートを押す */}
      <path d="M8 41 L17 26" />
      <Head x={19} y={22} />
      <path d="M17 27 L14 37 M15 35 L24 31 L33 22" />
      <path d="M28 14 L39 27 M33 12 L36 17" />
    </>
  ),
  ブルガリアンスクワット: (
    <>
      <path d="M6 42 H42" />
      {/* 後ろ足をベンチに乗せたランジ */}
      <path d="M30 35 H42 M39 35 V42" />
      <Head x={24} y={13} />
      <path d="M23 16 L21 28 M21 28 L14 33 L14 42 M21 28 L31 34" />
    </>
  ),
  ランジ: (
    <>
      <path d="M6 42 H42" />
      <Head x={23} y={12} />
      <path d="M23 15 L23 26 M23 26 L30 32 L30 42 M23 26 L16 34 L11 42" />
    </>
  ),
  レッグカール: (
    <>
      <path d="M8 34 H34 M12 34 V41 M30 34 V41" />
      {/* うつ伏せで踵を巻き上げる */}
      <Head x={8} y={30} />
      <path d="M11 30 H28 M28 30 L34 29 L37 19" />
      <Dot x={38} y={18} r={2.3} />
    </>
  ),
  カーフレイズ: (
    <>
      {/* 段差の縁でつま先立ち */}
      <path d="M10 39 H27 M27 39 V45 M27 45 H42" />
      <Head x={26} y={10} />
      <path d="M26 13 V32 M26 32 L25 36 M20 34 L26 38" />
    </>
  ),

  /* ===== 肩 ===== */
  ショルダープレス: (
    <>
      <Head x={24} y={16} />
      <path d="M24 19 V34 M24 34 L19 42 M24 34 L29 42" />
      {/* 両腕でダンベルを頭上へ */}
      <path d="M24 22 L16 18 L16 10 M24 22 L32 18 L32 10" />
      <path d="M11 9 H21 M27 9 H37" />
    </>
  ),
  サイドレイズ: (
    <>
      <Head x={24} y={13} />
      <path d="M24 16 V33 M24 33 L19 42 M24 33 L29 42" />
      <path d="M24 20 L10 18 M24 20 L38 18" />
      <Dot x={9} y={18} />
      <Dot x={39} y={18} />
    </>
  ),
  リアレイズ: (
    <>
      {/* 前傾して腕を横に開く */}
      <Head x={32} y={17} />
      <path d="M30 20 L20 30 M20 30 V42" />
      <path d="M27 24 L12 20 M27 24 L40 30" />
      <Dot x={11} y={20} />
      <Dot x={41} y={30} />
    </>
  ),
  アップライトロー: (
    <>
      <Head x={24} y={12} />
      <path d="M24 15 V34 M24 34 L20 42 M24 34 L28 42" />
      {/* 肘を張ってバーを顎まで */}
      <path d="M16 22 H32 M19 22 L23 28 M29 22 L25 28" />
    </>
  ),

  /* ===== 腕 ===== */
  アームカール: (
    <>
      <Head x={22} y={12} />
      <path d="M22 15 V33 M22 33 L19 42 M22 33 L26 42" />
      <path d="M22 19 L23 27 L32 21" />
      <Dot x={34} y={20} />
    </>
  ),
  ハンマーカール: (
    <>
      <Head x={22} y={12} />
      <path d="M22 15 V33 M22 33 L19 42 M22 33 L26 42" />
      <path d="M22 19 L23 27 L32 21" />
      {/* 縦持ちのダンベル */}
      <path d="M34 15 V26" />
    </>
  ),
  トライセプスエクステンション: (
    <>
      <Head x={22} y={17} />
      <path d="M22 20 V35 M22 35 L19 43 M22 35 L26 43" />
      {/* 頭上で肘を曲げ伸ばし */}
      <path d="M23 21 L26 9 M26 9 L35 13" />
      <Dot x={37} y={14} />
    </>
  ),
  ディップス: (
    <>
      {/* 平行棒に肘立ち */}
      <path d="M8 21 H19 M29 21 H40" />
      <Head x={24} y={11} />
      <path d="M24 14 V28 M24 16 L16 21 M24 16 L32 21" />
      <path d="M24 28 L20 34 L25 39" />
    </>
  ),

  /* ===== 体幹 ===== */
  プランク: (
    <>
      <path d="M6 42 H42" />
      <path d="M8 35 L33 30 M32 31 V40 M28 41 H37" />
      <Head x={37} y={29} />
    </>
  ),
  クランチ: (
    <>
      <path d="M6 42 H42" />
      {/* 膝を立てて上体を丸める */}
      <path d="M26 40 L18 32 L12 41 M26 40 L33 31" />
      <Head x={36} y={28} />
    </>
  ),
  レッグレイズ: (
    <>
      <path d="M6 42 H42" />
      <path d="M25 41 H37 M25 41 L13 24" />
      <Head x={41} y={40} />
    </>
  ),
  アブローラー: (
    <>
      <path d="M6 42 H46" />
      {/* 膝立ちで前方のホイールへ */}
      <path d="M13 41 L8 42 M13 41 L19 32 L32 26 M31 27 L37 33" />
      <Head x={35} y={23} />
      <Ring x={39} y={37} r={4.2} />
    </>
  ),
}

/** 汎用(自由入力種目): ダンベル */
const GENERIC = (
  <>
    <path d="M12 36 L36 12" />
    <path d="M8 24 L24 8 M24 40 L40 24" />
    <Dot x={10} y={22} r={2.4} />
    <Dot x={22} y={10} r={2.4} />
    <Dot x={26} y={38} r={2.4} />
    <Dot x={38} y={26} r={2.4} />
  </>
)

/** グループ代表アイコン(部位チップやグループ見出しに使う) */
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
      strokeWidth={3}
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
      <ExerciseIcon name={name} size={Math.round(size * 0.72)} />
    </span>
  )
}
