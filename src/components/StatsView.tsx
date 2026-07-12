import { useMemo, useState } from 'react'
import { useStore } from '../store'
import {
  aggregateByDay,
  currentStreak,
  dailySeries,
  levelFromXp,
  loadTrend,
  thisWeekProgress,
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
  const trend = trendText[loadTrend(habitEntries, habit)]
  const weeks12 = weeklySeries(habitEntries, 12)
  const allDays = dailySeries(data.entries, 15 * 7)
  const color = seriesVar(habit.colorSlot)

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

        {habit.metric !== 'none' && (
          <div className="card chart-card">
            <h3>週別ボリューム({habit.unit})</h3>
            <p className="subtitle">レベルが上がっているかは、この線の傾きで確認</p>
            <TrendLineChart weeks={weeks12} unit={habit.unit} color={color} />
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
