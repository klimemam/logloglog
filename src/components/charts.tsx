import { useEffect, useRef, useState } from 'react'
import type { MatrixRow, WeekAgg } from '../lib/stats'
import { formatDateShort } from '../lib/dates'

/** チャート内ホバー/タップのツールチップ状態 */
interface Tip {
  x: number
  y: number
  text: string
}

function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const show = (e: React.PointerEvent, text: string) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, text })
  }
  const hide = () => setTip(null)
  return { tip, wrapRef, show, hide }
}

const niceMax = (v: number): number => {
  if (v <= 5) return 5
  const pow = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * pow >= v) return m * pow
  }
  return 10 * pow
}

const W = 520
const H = 180
const PAD = { top: 14, right: 12, bottom: 24, left: 34 }

/**
 * 週別の回数バーチャート + 目標ライン。
 * バーは≤24px・上端4px角丸・ベースラインから伸びる。隣接バーはバンド余白で分離。
 */
export function WeeklyBarChart({
  weeks,
  target,
  color,
}: {
  weeks: WeekAgg[]
  target: number
  color: string
}) {
  const { tip, wrapRef, show, hide } = useTooltip()
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxV = niceMax(Math.max(target, ...weeks.map((w) => w.count)))
  const band = plotW / weeks.length
  const barW = Math.min(24, band * 0.55)
  const y = (v: number) => PAD.top + plotH - (v / maxV) * plotH
  const ticks = [0, maxV / 2, maxV].map((t) => Math.round(t * 10) / 10)
  const targetY = y(target)

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="週別の記録回数">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
            >
              {t}
            </text>
          </g>
        ))}
        {/* 目標ライン(何回が目標かはサブタイトルが伝える) */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={targetY}
          y2={targetY}
          stroke="var(--text-muted)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {weeks.map((w, i) => {
          const cx = PAD.left + band * (i + 0.5)
          const barH = Math.max(0, PAD.top + plotH - y(w.count))
          const r = Math.min(4, barW / 2, barH)
          const label = `${formatDateShort(w.weekStart)}週: ${w.count}回`
          return (
            <g key={w.weekStart}>
              {/* 当たり判定はバンド全体(マークより大きく) */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                onPointerMove={(e) => show(e, label)}
                onPointerDown={(e) => show(e, label)}
                onPointerLeave={hide}
              />
              {w.count > 0 && (
                <path
                  d={`M ${cx - barW / 2} ${PAD.top + plotH}
                      V ${y(w.count) + r}
                      Q ${cx - barW / 2} ${y(w.count)} ${cx - barW / 2 + r} ${y(w.count)}
                      H ${cx + barW / 2 - r}
                      Q ${cx + barW / 2} ${y(w.count)} ${cx + barW / 2} ${y(w.count) + r}
                      V ${PAD.top + plotH} Z`}
                  fill={color}
                  pointerEvents="none"
                />
              )}
              {(i === weeks.length - 1 || i % 4 === 0) && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {formatDateShort(w.weekStart)}
                </text>
              )}
            </g>
          )
        })}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
      </svg>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}

/**
 * 週別値のラインチャート(2pxライン、~10%のエリアウォッシュ、終端ドット+直接ラベル)。
 * value が null の週は「記録なし」として線を切る(0として描かない)。
 */
export function TrendLineChart({
  points: data,
  unit,
  color,
}: {
  points: { weekStart: string; value: number | null }[]
  unit: string
  color: string
}) {
  const { tip, wrapRef, show, hide } = useTooltip()
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const values = data.map((p) => p.value).filter((v): v is number => v != null)
  const maxV = niceMax(Math.max(1, ...values))
  const band = plotW / data.length
  const px = (i: number) => PAD.left + band * (i + 0.5)
  const py = (v: number) => PAD.top + plotH - (v / maxV) * plotH
  const ticks = [0, maxV / 2, maxV].map((t) => Math.round(t * 10) / 10)
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

  // null で分断された連続区間ごとにセグメントを作る
  const segments: { i: number; v: number }[][] = []
  let cur: { i: number; v: number }[] = []
  data.forEach((p, i) => {
    if (p.value == null) {
      if (cur.length) segments.push(cur)
      cur = []
    } else {
      cur.push({ i, v: p.value })
    }
  })
  if (cur.length) segments.push(cur)
  const lastIdx = data.reduce((acc, p, i) => (p.value != null ? i : acc), -1)

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="週別の推移">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={py(t)}
              y2={py(t)}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={py(t) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
            >
              {t}
            </text>
          </g>
        ))}
        {segments.map((seg) => {
          const pts = seg.map((p) => `${px(p.i)},${py(p.v)}`).join(' ')
          const area = `${px(seg[0].i)},${PAD.top + plotH} ${pts} ${px(seg[seg.length - 1].i)},${PAD.top + plotH}`
          return (
            <g key={seg[0].i}>
              {seg.length > 1 && <polygon points={area} fill={color} opacity={0.1} />}
              <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* 孤立点はドットで示す(線が引けないため) */}
              {seg.length === 1 && <circle cx={px(seg[0].i)} cy={py(seg[0].v)} r={4} fill={color} />}
            </g>
          )
        })}
        {data.map((p, i) => {
          const label =
            p.value == null
              ? `${formatDateShort(p.weekStart)}週: 記録なし`
              : `${formatDateShort(p.weekStart)}週: ${fmt(p.value)}${unit}`
          return (
            <g key={p.weekStart}>
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                onPointerMove={(e) => show(e, label)}
                onPointerDown={(e) => show(e, label)}
                onPointerLeave={hide}
              />
              {(i === data.length - 1 || i % 4 === 0) && (
                <text
                  x={px(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {formatDateShort(p.weekStart)}
                </text>
              )}
            </g>
          )
        })}
        {/* 終端(最後に記録がある週)のドット: サーフェスリング付き + 直接ラベル */}
        {lastIdx >= 0 && (
          <g pointerEvents="none">
            <circle cx={px(lastIdx)} cy={py(data[lastIdx].value!)} r={6} fill="var(--surface-1)" />
            <circle cx={px(lastIdx)} cy={py(data[lastIdx].value!)} r={4} fill={color} />
            <text
              x={px(lastIdx) - 8}
              y={py(data[lastIdx].value!) - 10}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill="var(--text-primary)"
            >
              {fmt(data[lastIdx].value!)}
              {unit}
            </text>
          </g>
        )}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
      </svg>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}

/**
 * デイリーサマリー: 行=習慣、列=日のマトリクス。
 * セルの濃さ = その日の量をその習慣の期間内最大値で正規化した充実度
 * (シーケンシャルblueランプ)。睡眠や仕事などの生活ログと習慣を
 * 並べて見ることで、何が習慣の維持に効いているかを探れる。
 */
export function DailyMatrix({
  rows,
  days,
  unitOf,
}: {
  rows: MatrixRow[]
  days: string[]
  unitOf: (row: MatrixRow) => string
}) {
  const { tip, wrapRef, show, hide } = useTooltip()
  // 初期表示は最新の日(右端)に合わせる
  useEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollLeft = wrapRef.current.scrollWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const cell = 15
  const gap = 3
  const labelW = 92
  const width = labelW + days.length * (cell + gap)
  const height = rows.length * (cell + gap) + 16
  const seq = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)']
  const colorFor = (v: number, max: number) =>
    v <= 0 ? seq[0] : seq[Math.min(4, Math.max(1, Math.ceil((v / max) * 4)))]
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

  return (
    <div ref={wrapRef} style={{ position: 'relative', overflowX: 'auto' }}>
      <svg
        width={width}
        height={height}
        style={{ display: 'block' }}
        role="img"
        aria-label="習慣ごとの日別サマリー"
      >
        {rows.map((row, r) => (
          <g key={row.habit.id}>
            <text
              x={labelW - 8}
              y={r * (cell + gap) + cell - 3}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill="var(--text-secondary)"
            >
              {`${row.habit.emoji} ${row.habit.name.slice(0, 5)}`}
            </text>
            {row.values.map((v, c) => {
              const label = `${formatDateShort(days[c])} ${row.habit.name}: ${
                v > 0 ? `${fmt(v)}${unitOf(row)}` : '記録なし'
              }`
              return (
                <rect
                  key={c}
                  x={labelW + c * (cell + gap)}
                  y={r * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={colorFor(v, row.max)}
                  onPointerMove={(e) => show(e, label)}
                  onPointerDown={(e) => show(e, label)}
                  onPointerLeave={hide}
                />
              )
            })}
          </g>
        ))}
        {days.map(
          (day, c) =>
            (c === days.length - 1 || c % 7 === 0) && (
              <text
                key={day}
                x={labelW + c * (cell + gap) + cell / 2}
                y={height - 3}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
              >
                {formatDateShort(day)}
              </text>
            ),
        )}
      </svg>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}

/**
 * 直近15週の日別ヒートマップ(シーケンシャルblueランプ、列=週、行=曜日)。
 */
export function CalendarHeatmap({ days }: { days: { date: string; count: number }[] }) {
  const { tip, wrapRef, show, hide } = useTooltip()
  const cell = 12
  const gap = 3
  const weeks: { date: string; count: number }[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  const width = weeks.length * (cell + gap) + 26
  const height = 7 * (cell + gap) + 4
  const seq = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)']
  const colorFor = (c: number) => seq[Math.min(c, seq.length - 1)]
  const dayLabels = ['月', '', '水', '', '金', '', '']

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="日別の記録ヒートマップ"
      >
        {dayLabels.map(
          (l, r) =>
            l && (
              <text
                key={r}
                x={0}
                y={r * (cell + gap) + cell - 2}
                fontSize={9}
                fill="var(--text-muted)"
              >
                {l}
              </text>
            ),
        )}
        {weeks.map((week, c) =>
          week.map((d, r) => {
            const label = `${formatDateShort(d.date)}: ${d.count}回`
            return (
              <rect
                key={d.date}
                x={26 + c * (cell + gap)}
                y={r * (cell + gap)}
                width={cell}
                height={cell}
                rx={2}
                fill={colorFor(d.count)}
                onPointerMove={(e) => show(e, label)}
                onPointerDown={(e) => show(e, label)}
                onPointerLeave={hide}
              />
            )
          }),
        )}
      </svg>
      <div className="heatmap-legend">
        <span>少</span>
        {seq.map((s) => (
          <span key={s} className="cell" style={{ background: s }} />
        ))}
        <span>多</span>
      </div>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}
