import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Entry } from '../types'
import {
  aggregateByDay,
  currentStreak,
  dailyHabitMatrix,
  dailySeries,
  exerciseRecords,
  exerciseWeeklyBest,
  habitInsights,
  intensityZone,
  levelFromXp,
  loadTrend,
  quitStats,
  recentExercises,
  thisWeekProgress,
  weeklyBestSeries,
  weeklySeries,
  xpForEntries,
} from '../lib/stats'
import { WeeklyBarChart, TrendLineChart, CalendarHeatmap, DailyMatrix } from './charts'
import { seriesVar } from './HomeView'
import { t, tName } from '../lib/i18n'
import { Header } from './Header'
import { DayDetailSheet } from './DayDetail'

const trendText = {
  up: { label: t('↑ レベルアップ中'), cls: 'up', desc: t('直近4週の負荷が前の4週より増えています') },
  flat: { label: t('→ 維持'), cls: '', desc: t('直近4週の負荷は前の4週とほぼ同じです') },
  down: { label: t('↓ ペースダウン'), cls: 'down', desc: t('直近4週の負荷が前の4週より減っています') },
  none: { label: t('まだデータ不足'), cls: '', desc: t('記録を続けると傾向が表示されます') },
} as const

const trendTextTime = {
  up: { label: t('↑ レベルアップ中'), cls: 'up', desc: t('直近4週のベストタイムが縮んでいます') },
  flat: { label: t('→ 維持'), cls: '', desc: t('直近4週のタイムは前の4週とほぼ同じです') },
  down: { label: t('↓ ペースダウン'), cls: 'down', desc: t('直近4週のタイムが前の4週より伸びています') },
  none: { label: t('まだデータ不足'), cls: '', desc: t('記録を続けると傾向が表示されます') },
} as const

/** 筋トレ習慣の種目別ベスト(最大重量 / 自重種目は最大回数)チャート */
function ExerciseProgress({ entries, color }: { entries: Entry[]; color: string }) {
  const exercises = useMemo(() => recentExercises(entries), [entries])
  const [selected, setSelected] = useState<string | null>(null)
  const exercise = selected && exercises.includes(selected) ? selected : exercises[0]
  if (!exercise) {
    return <p className="empty-note">{t('種目を記録すると成長グラフが表示されます')}</p>
  }
  const { points, byWeight } = exerciseWeeklyBest(entries, exercise, 12)
  const records = exerciseRecords(entries, exercise)
  const history = [...entries]
    .filter((e) => e.exercise === exercise)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5)

  // セットの強度%(自己ベスト推定1RM比、100% = 自己ベスト)
  const setBadge = (weight: number | undefined, reps: number) => {
    if (weight != null && records.best1RM) {
      const pct = Math.round((weight / records.best1RM) * 100)
      return { pct, cls: intensityZone(pct) }
    }
    if (weight == null && reps > 0 && records.bestReps) {
      const pct = Math.round((reps / records.bestReps) * 100)
      return { pct, cls: intensityZone(pct) }
    }
    return null
  }

  return (
    <>
      <div className="chip-row">
        {exercises.map((ex) => (
          <button
            key={ex}
            className={`chip${ex === exercise ? ' active' : ''}`}
            onClick={() => setSelected(ex)}
          >
            {t(ex)}
          </button>
        ))}
      </div>
      <div className="records-row">
        {records.best1RM != null && (
          <div className="record">
            <span className="record-label">{t('推定1RMベスト')}</span>
            <span className="record-value">{records.best1RM}kg</span>
          </div>
        )}
        {records.bestWeight != null && (
          <div className="record">
            <span className="record-label">{t('最大重量')}</span>
            <span className="record-value">{records.bestWeight}kg</span>
          </div>
        )}
        {records.bestReps != null && (
          <div className="record">
            <span className="record-label">{t('最多回数')}</span>
            <span className="record-value">{records.bestReps}{t('回')}</span>
          </div>
        )}
      </div>
      <p className="subtitle">
        {byWeight
          ? t('{ex} の週間ベスト推定1RM(重量×回数から換算した最大挙上重量)(直近12週)', { ex: t(exercise) })
          : t('{ex} の週間ベスト回数(自重)(直近12週)', { ex: t(exercise) })}
      </p>
      <TrendLineChart points={points} unit={byWeight ? 'kg' : t('回')} color={color} />
      {history.length > 0 && (
        <div className="history">
          <p className="subtitle" style={{ marginTop: 12 }}>
            {t('履歴(セットごとの強度 = 自己ベスト推定1RM比)')}
          </p>
          {history.map((e) => {
            const sets = e.setsDetail?.length
              ? e.setsDetail
              : [{ weight: e.weight, reps: e.reps ?? 0 }]
            return (
              <div key={e.id} className="history-row">
                <span className="history-date">{e.date.slice(5).replace('-', '/')}</span>
                <span className="history-sets">
                  {sets.map((s, i) => {
                    const b = setBadge(s.weight, s.reps ?? 0)
                    return (
                      <span key={i} className="set-chip">
                        {s.weight != null ? `${s.weight}kg×` : ''}
                        {s.reps}
                        {b && <em className={`intensity ${b.cls}`}>{b.pct}%</em>}
                      </span>
                    )
                  })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export function StatsView() {
  const { data } = useStore()
  const habits = data.habits.filter((h) => !h.archived)
  const [selectedId, setSelectedId] = useState<string | null>(habits[0]?.id ?? null)
  const [range, setRange] = useState(12)
  const [detailDay, setDetailDay] = useState<string | null>(null)
  const habit = habits.find((h) => h.id === selectedId) ?? habits[0]

  const habitEntries = useMemo(
    () => (habit ? data.entries.filter((e) => e.habitId === habit.id) : []),
    [data.entries, habit],
  )

  if (!habit) {
    return (
      <main className="app-main">
        <p className="empty-note">{t('習慣を追加すると統計が表示されます。')}</p>
      </main>
    )
  }

  const isStrength = habit.kind === 'strength'
  const isQuit = habit.kind === 'quit'
  const week = thisWeekProgress(data.entries, habit)
  // やめる習慣: 継続はスリップ記録からの逆算、XPは「クリアした日数」で貯まる
  const qs = isQuit ? quitStats(habit, habitEntries) : null
  const streak = qs ? qs.current : currentStreak(aggregateByDay(habitEntries))
  const { level, intoLevel, needed } = levelFromXp(xpForEntries(qs ? qs.cleanDays : habitEntries.length))
  const trend = (habit.lowerIsBetter ? trendTextTime : trendText)[loadTrend(data.entries, habit)]
  const weeksN = weeklySeries(habitEntries, range)
  const allDays = dailySeries(data.entries, 15 * 7)
  const color = seriesVar(habit.colorSlot)
  const matrix = dailyHabitMatrix(habits, data.entries, 28)
  const insights = habitInsights(habits, data.entries, 56)

  return (
    <>
      <Header title={t('統計')} subtitle={t('目標に対する習慣の維持と、レベルの推移')} />
      <main className="app-main">
        <div className="chip-row">
          {habits.map((h) => (
            <button
              key={h.id}
              className={`chip${h.id === habit.id ? ' active' : ''}`}
              onClick={() => setSelectedId(h.id)}
            >
              <span className="color-dot" style={{ background: seriesVar(h.colorSlot) }} />
              {tName(h.name).charAt(0)} {tName(h.name)}
            </button>
          ))}
        </div>

        <div className="chip-row" style={{ paddingTop: 0 }}>
          {([
            [4, t('4週')],
            [12, t('12週')],
            [26, t('半年')],
            [52, t('1年')],
          ] as [number, string][]).map(([n, label]) => (
            <button key={n} className={`chip${range === n ? ' active' : ''}`} onClick={() => setRange(n)}>
              {label}
            </button>
          ))}
        </div>

        <div className="tile-grid">
          {qs ? (
            <div className="stat-tile">
              <div className="label">{t('継続日数')}</div>
              <div className="value">
                {qs.current}
                <small> {t('日')}</small>
              </div>
              <div className={`delta${qs.current >= 3 ? ' up' : ''}`}>
                {qs.current >= 3 ? t('🔥 いい調子!') : t('今日から積み上げよう')}
              </div>
            </div>
          ) : (
            <div className="stat-tile">
              <div className="label">{t('今週の達成')}</div>
              <div className="value">
                {week.count}
                <small>{t(' / {n}回', { n: week.target })}</small>
              </div>
              <div className={`delta${week.done ? ' up' : ''}`}>
                {week.done ? t('🎉 目標達成!') : t('あと{n}回', { n: week.target - week.count })}
                {' ・ '}
                {(() => {
                  const lastWeek = weeklySeries(habitEntries, 2)[0].count
                  const d = week.count - lastWeek
                  return `${d > 0 ? '↑' : d < 0 ? '↓' : '→'} ${t('先週 {n}回', { n: lastWeek })}`
                })()}
              </div>
            </div>
          )}
          {qs ? (
            <div className="stat-tile">
              <div className="label">{t('ベスト継続')}</div>
              <div className="value">
                {qs.best}
                <small> {t('日')}</small>
              </div>
              <div className={`delta${qs.best > 0 && qs.current === qs.best ? ' up' : ''}`}>
                {qs.best > 0 && qs.current === qs.best ? t('🎉 記録更新中!') : t('記録更新を目指そう')}
              </div>
            </div>
          ) : (
            <div className="stat-tile">
              <div className="label">{t('連続記録')}</div>
              <div className="value">
                {streak}
                <small> {t('日')}</small>
              </div>
              <div className="delta">{streak >= 3 ? t('🔥 いい調子!') : t('毎日続けよう')}</div>
            </div>
          )}
          <div className="stat-tile">
            <div className="label">{t('レベル')}</div>
            <div className="value">Lv.{level}</div>
            <div className="level-bar" aria-label={`次のレベルまで ${needed - intoLevel} XP`}>
              <div className="fill" style={{ width: `${(intoLevel / needed) * 100}%` }} />
            </div>
            <div className="delta">
              {qs
                ? t('あと{n}XP({m}日)', { n: needed - intoLevel, m: Math.ceil((needed - intoLevel) / 10) })
                : t('あと{n}XP({m}回)', { n: needed - intoLevel, m: Math.ceil((needed - intoLevel) / 10) })}
            </div>
          </div>
          {qs ? (
            <div className="stat-tile">
              <div className="label">{t('今週のスリップ')}</div>
              <div className="value">
                {weeklySeries(habitEntries, 1)[0].count}
                <small> {t('回')}</small>
              </div>
              <div className="delta">
                {(() => {
                  const thisW = weeklySeries(habitEntries, 1)[0].count
                  const lastW = weeklySeries(habitEntries, 2)[0].count
                  return `${thisW < lastW ? '↓' : thisW > lastW ? '↑' : '→'} ${t('先週 {n}回', { n: lastW })}`
                })()}
              </div>
            </div>
          ) : (
            <div className="stat-tile">
              <div className="label">{t('負荷トレンド')}</div>
              <div className="value" style={{ fontSize: 18 }}>
                <span className={`delta ${trend.cls}`} style={{ fontSize: 18 }}>
                  {trend.label}
                </span>
              </div>
              <div className="delta">{trend.desc}</div>
            </div>
          )}
        </div>

        <div className="card chart-card">
          <h3>{qs ? t('週別のスリップ回数') : t('週別の回数')}</h3>
          <p className="subtitle">
            {qs
              ? t('やってしまった回数。少ないほど良い(直近{n}週)', { n: range })
              : t('直近{n}週 × 週{m}回の目標', { n: range, m: habit.weeklyTarget })}
          </p>
          <WeeklyBarChart weeks={weeksN} target={qs ? 0 : habit.weeklyTarget} color={qs ? 'var(--series-6)' : color} />
        </div>

        {isStrength && (
          <div className="card chart-card">
            <h3>{t('種目別の成長')}</h3>
            <ExerciseProgress entries={habitEntries} color={color} />
          </div>
        )}

        {habit.metric !== 'none' && habit.lowerIsBetter && (
          <div className="card chart-card">
            <h3>{t('週のベストタイム({u})', { u: habit.unit })}</h3>
            <p className="subtitle">{t('レベルが上がっているかは、この線が下がっているかで確認')}</p>
            <TrendLineChart
              points={weeklyBestSeries(habitEntries, range)}
              unit={habit.unit}
              color={color}
            />
          </div>
        )}

        {habit.metric !== 'none' && !habit.lowerIsBetter && (
          <div className="card chart-card">
            <h3>{t('週別ボリューム({u})', { u: habit.unit })}</h3>
            <p className="subtitle">
              {isStrength
                ? t('週の総セット数。レベルが上がっているかは種目別の成長も確認')
                : t('レベルが上がっているかは、この線の傾きで確認')}
            </p>
            <TrendLineChart
              points={weeksN.map((w) => ({ weekStart: w.weekStart, value: w.value }))}
              unit={habit.unit}
              color={color}
            />
          </div>
        )}

        <div className="card chart-card">
          <h3>{t('デイリーサマリー')}</h3>
          <p className="subtitle">
{t('全習慣 × 日(直近4週)。濃さ = その日の量(各習慣の最大値比)。睡眠や仕事と並べると、習慣の維持に何が効いているかが見えてくる')}
          </p>
          <DailyMatrix
            rows={matrix.rows}
            days={matrix.days}
            unitOf={(row) => (row.habit.metric === 'none' ? t('回') : row.habit.unit || '')}
            onDayTap={setDetailDay}
          />
        </div>

        {insights.length > 0 && (
          <div className="card chart-card">
            <h3>{t('気づき')}</h3>
            <p className="subtitle">{t('直近8週の記録から。相関であって因果ではない点に注意(参考)')}</p>
            <div className="insights">
              {insights.map((ins, i) => {
                const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
                const unit = ins.bHabit.unit || ''
                const more = ins.withAvg > ins.withoutAvg
                return (
                  <div key={i} className="insight-row">
                    💡{' '}
                    {t(more ? '{a}をやった日は、{b}が多い:' : '{a}をやった日は、{b}が少ない:', {
                        a: `${tName(ins.aHabit.name).charAt(0)} ${tName(ins.aHabit.name)}`,
                        b: `${tName(ins.bHabit.name).charAt(0)} ${tName(ins.bHabit.name)}`,
                    })}{' '}
                    <span className="insight-nums">
                      {fmt(ins.withAvg)}
                      {unit} <small>vs {fmt(ins.withoutAvg)}{unit}</small>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="card chart-card">
          <h3>{t('記録カレンダー')}</h3>
          <p className="subtitle">{t('全習慣の記録(直近15週)')}</p>
          <CalendarHeatmap days={allDays} />
        </div>

        <DayDetailSheet date={detailDay} onClose={() => setDetailDay(null)} />
      </main>
    </>
  )
}
