import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Entry } from '../types'
import {
  aggregateByDay,
  currentStreak,
  dailySeries,
  exerciseWeeklyBest,
  levelFromXp,
  loadTrend,
  recentExercises,
  thisWeekProgress,
  weeklyBestSeries,
  weeklySeries,
  xpForEntries,
} from '../lib/stats'
import { WeeklyBarChart, TrendLineChart, CalendarHeatmap } from './charts'
import { seriesVar } from './HomeView'

const trendText = {
  up: { label: '↑ レベルアップ中', cls: 'up', desc: '直近4週の負荷が前の4週より増えています' },
  flat: { label: '→ 維持', cls: '', desc: '直近4週の負荷は前の4週とほぼ同じです' },
  down: { label: '↓ ペースダウン', cls: 'down', desc: '直近4週の負荷が前の4週より減っています' },
  none: { label: 'まだデータ不足', cls: '', desc: '記録を続けると傾向が表示されます' },
} as const

const trendTextTime = {
  up: { label: '↑ レベルアップ中', cls: 'up', desc: '直近4週のベストタイムが縮んでいます' },
  flat: { label: '→ 維持', cls: '', desc: '直近4週のタイムは前の4週とほぼ同じです' },
  down: { label: '↓ ペースダウン', cls: 'down', desc: '直近4週のタイムが前の4週より伸びています' },
  none: { label: 'まだデータ不足', cls: '', desc: '記録を続けると傾向が表示されます' },
} as const

/** 筋トレ習慣の種目別ベスト(最大重量 / 自重種目は最大回数)チャート */
function ExerciseProgress({ entries, color }: { entries: Entry[]; color: string }) {
  const exercises = useMemo(() => recentExercises(entries), [entries])
  const [selected, setSelected] = useState<string | null>(null)
  const exercise = selected && exercises.includes(selected) ? selected : exercises[0]
  if (!exercise) {
    return <p className="empty-note">種目を記録すると成長グラフが表示されます</p>
  }
  const { points, byWeight } = exerciseWeeklyBest(entries, exercise, 12)
  return (
    <>
      <div className="chip-row">
        {exercises.map((ex) => (
          <button
            key={ex}
            className={`chip${ex === exercise ? ' active' : ''}`}
            onClick={() => setSelected(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="subtitle">
        {exercise} の週間ベスト
        {byWeight ? '推定1RM(重量×回数から換算した最大挙上重量)' : '回数(自重)'}(直近12週)
      </p>
      <TrendLineChart points={points} unit={byWeight ? 'kg' : '回'} color={color} />
    </>
  )
}

export function StatsView() {
  const { data } = useStore()
  const habits = data.habits.filter((h) => !h.archived)
  const [selectedId, setSelectedId] = useState<string | null>(habits[0]?.id ?? null)
  const habit = habits.find((h) => h.id === selectedId) ?? habits[0]

  const habitEntries = useMemo(
    () => (habit ? data.entries.filter((e) => e.habitId === habit.id) : []),
    [data.entries, habit],
  )

  if (!habit) {
    return (
      <main className="app-main">
        <p className="empty-note">習慣を追加すると統計が表示されます。</p>
      </main>
    )
  }

  const week = thisWeekProgress(data.entries, habit)
  const streak = currentStreak(aggregateByDay(habitEntries))
  const { level, intoLevel, needed } = levelFromXp(xpForEntries(habitEntries.length))
  const trend = (habit.lowerIsBetter ? trendTextTime : trendText)[loadTrend(data.entries, habit)]
  const weeks12 = weeklySeries(habitEntries, 12)
  const allDays = dailySeries(data.entries, 15 * 7)
  const color = seriesVar(habit.colorSlot)
  const isStrength = habit.kind === 'strength'

  return (
    <>
      <header className="app-header">
        <h1>統計</h1>
        <div className="date">目標に対する習慣の維持と、レベルの推移</div>
      </header>
      <main className="app-main">
        <div className="chip-row">
          {habits.map((h) => (
            <button
              key={h.id}
              className={`chip${h.id === habit.id ? ' active' : ''}`}
              onClick={() => setSelectedId(h.id)}
            >
              <span className="color-dot" style={{ background: seriesVar(h.colorSlot) }} />
              {h.emoji} {h.name}
            </button>
          ))}
        </div>

        <div className="tile-grid">
          <div className="stat-tile">
            <div className="label">今週の達成</div>
            <div className="value">
              {week.count}
              <small> / {week.target}回</small>
            </div>
            <div className={`delta${week.done ? ' up' : ''}`}>
              {week.done ? '🎉 目標達成!' : `あと${week.target - week.count}回`}
            </div>
          </div>
          <div className="stat-tile">
            <div className="label">連続記録</div>
            <div className="value">
              {streak}
              <small> 日</small>
            </div>
            <div className="delta">{streak >= 3 ? '🔥 いい調子!' : '毎日続けよう'}</div>
          </div>
          <div className="stat-tile">
            <div className="label">レベル</div>
            <div className="value">Lv.{level}</div>
            <div className="level-bar" aria-label={`次のレベルまで ${needed - intoLevel} XP`}>
              <div className="fill" style={{ width: `${(intoLevel / needed) * 100}%` }} />
            </div>
            <div className="delta">
              あと{needed - intoLevel}XP({Math.ceil((needed - intoLevel) / 10)}回)
            </div>
          </div>
          <div className="stat-tile">
            <div className="label">負荷トレンド</div>
            <div className="value" style={{ fontSize: 18 }}>
              <span className={`delta ${trend.cls}`} style={{ fontSize: 18 }}>
                {trend.label}
              </span>
            </div>
            <div className="delta">{trend.desc}</div>
          </div>
        </div>

        <div className="card chart-card">
          <h3>週別の回数</h3>
          <p className="subtitle">直近12週 × 週{habit.weeklyTarget}回の目標</p>
          <WeeklyBarChart weeks={weeks12} target={habit.weeklyTarget} color={color} />
        </div>

        {isStrength && (
          <div className="card chart-card">
            <h3>種目別の成長</h3>
            <ExerciseProgress entries={habitEntries} color={color} />
          </div>
        )}

        {habit.metric !== 'none' && habit.lowerIsBetter && (
          <div className="card chart-card">
            <h3>週のベストタイム({habit.unit})</h3>
            <p className="subtitle">レベルが上がっているかは、この線が下がっているかで確認</p>
            <TrendLineChart
              points={weeklyBestSeries(habitEntries, 12)}
              unit={habit.unit}
              color={color}
            />
          </div>
        )}

        {habit.metric !== 'none' && !habit.lowerIsBetter && (
          <div className="card chart-card">
            <h3>週別ボリューム({habit.unit})</h3>
            <p className="subtitle">
              {isStrength
                ? '週の総セット数。レベルが上がっているかは種目別の成長も確認'
                : 'レベルが上がっているかは、この線の傾きで確認'}
            </p>
            <TrendLineChart
              points={weeks12.map((w) => ({ weekStart: w.weekStart, value: w.value }))}
              unit={habit.unit}
              color={color}
            />
          </div>
        )}

        <div className="card chart-card">
          <h3>記録カレンダー</h3>
          <p className="subtitle">全習慣の記録(直近15週)</p>
          <CalendarHeatmap days={allDays} />
        </div>
      </main>
    </>
  )
}
