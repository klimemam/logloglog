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
      {/* ベンチプレスとの識別点 = 器具が左右2つに分かれていること */}
      <path d="M9 29 H33 M20 29 L17 19 M31 29 L34 19" />
      <Head x={38} y={29} />
      <path d="M11 17 H21 M12 12.5 V21.5 M20 12.5 V21.5" />
      <path d="M30 17 H40 M31 12.5 V21.5 M39 12.5 V21.5" />
    </>
  ),
  インクラインベンチプレス: (
    <>
      {/* 45°の背もたれ1本+体を沿わせ、腕は垂直にバーへ(線数を絞る) */}
      <path d="M9 41 L29 25" />
      <Head x={32} y={22} />
      <path d="M22 30 V16 M28 26 V16" />
      <path d="M14 15 H42 M18 10 V21 M38 10 V21" />
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
      {/* 上端いっぱいのバー+座った人物(マティーニグラスに見える対称形を崩す) */}
      <path d="M6 8 H42" />
      <Head x={26} y={17} />
      <path d="M26 21 L14 9 M26 21 L35 9" />
      <path d="M26 21 V33 M26 33 L34 35 L34 43 M18 36 H30" />
    </>
  ),
  ベントオーバーロー: (
    <>
      {/* デッドリフトとの識別点 = プレートを床から腹の高さへ引き上げている */}
      <path d="M8 45 H40" />
      <path d="M16 43 L17 35 L19 33 L32 26 M30 28 L26 33" />
      <Head x={35} y={24} />
      <Ring x={26} y={36} r={3.5} />
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
      {/* リクライニングした人物が足先の太い板(スレッド)を押す */}
      <path d="M10 42 L19 30" />
      <Head x={21} y={27} />
      <path d="M16 36 L27 31 L33 23" />
      <path d="M28 13 L41 26" strokeWidth={4.5} />
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
      <path d="M10 36 H30 M14 36 V43 M27 36 V43" />
      {/* うつ伏せの頭を端に出し、踵の大きな弧を主役にする */}
      <Head x={7} y={32} />
      <path d="M11 32 H26 M26 32 Q34 32 35 20" />
      <Dot x={35} y={18} r={2.6} />
    </>
  ),
  カーフレイズ: (
    <>
      {/* 明確なブロックの縁でつま先立ち。踵の浮きを誇張する */}
      <path d="M4 46 H44 M10 46 V40 H26 V46" />
      <Head x={23} y={8} />
      <path d="M23 11 V35 M23 16 L28 23 M17 33 L26 40" />
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
      {/* 水平に曲げた胴+左右へ真っ直ぐ伸ばした腕(先端がダンベル) */}
      <path d="M20 43 V34 M20 34 L33 28" />
      <Head x={36} y={26} />
      <path d="M18 22 L42 35" />
      <Dot x={17} y={21.5} />
      <Dot x={43} y={35.5} />
    </>
  ),
  アップライトロー: (
    <>
      <Head x={24} y={8} />
      <path d="M24 11 V33 M24 33 L19 43 M24 33 L29 43" />
      {/* 頭・肘・バーの3層を分離。肘はバー幅の内側で45°に立てる(羽に見せない) */}
      <path d="M15 22 H33 M15 19 V25 M33 19 V25" />
      <path d="M24 17 L17 13 L20 22 M24 17 L31 13 L28 22" />
    </>
  ),

  /* ===== 腕 ===== */
  アームカール: (
    <>
      <Head x={20} y={9} />
      <path d="M20 12 V33 M20 33 L16 43 M20 33 L25 43" />
      {/* 横持ちのダンベル(ハンマーカールは縦持ち) */}
      <path d="M20 17 V27 M20 27 L31 20" />
      <path d="M26 20 H37 M27 16.5 V23.5 M36 16.5 V23.5" />
    </>
  ),
  ハンマーカール: (
    <>
      <Head x={20} y={9} />
      <path d="M20 12 V33 M20 33 L16 43 M20 33 L25 43" />
      <path d="M20 17 V27 M20 27 L31 21" />
      {/* 縦持ちのダンベル */}
      <path d="M32 14 V28 M28 15 H36 M28 27 H36" />
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
      {/* 支柱付きの平行棒に腕で体を支える */}
      <path d="M6 20 H18 M12 20 V42 M30 20 H42 M36 20 V42" />
      <Head x={24} y={9} />
      <path d="M24 12 V27 M24 14 L15 20 M24 14 L33 20" />
      <path d="M24 27 L19 33 L23 39" />
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
