import { useState } from 'react'
import { useStore } from '../store'
import type { Habit, MetricType } from '../types'
import { seriesVar } from './HomeView'
import { t, tName } from '../lib/i18n'

/** フォーム上の「記録するもの」。strength は保存時に kind: 'strength' へ変換される */
type FormMetric = MetricType | 'strength'

const metricOptions: { value: FormMetric; label: string; defaultUnit: string }[] = [
  { value: 'none', label: t('やった/やらない だけ'), defaultUnit: '' },
  { value: 'duration', label: t('時間(分)'), defaultUnit: t('分') },
  { value: 'distance', label: t('距離(km)'), defaultUnit: 'km' },
  { value: 'reps', label: t('量(回・ページなど自由な単位)'), defaultUnit: t('回') },
  { value: 'strength', label: t('筋トレ(種目×セット×回数×重量)'), defaultUnit: t('セット') },
]

const emptyForm = {
  name: '',
  emoji: '⭐',
  colorSlot: 2,
  metric: 'none' as FormMetric,
  unit: '',
  weeklyTarget: 3,
  defaultValue: '',
  lowerIsBetter: false,
}

type Form = typeof emptyForm

/** よくある習慣のプリセット。読書や100マス計算など、何でもここから始められる */
const presets: (Partial<Form> & { name: string; emoji: string })[] = [
  { name: t('筋トレ'), emoji: '💪', metric: 'strength', colorSlot: 0, weeklyTarget: 3 },
  { name: t('ランニング'), emoji: '🏃', metric: 'distance', unit: 'km', defaultValue: '5', colorSlot: 1, weeklyTarget: 2 },
  { name: t('ウォーキング'), emoji: '🚶', metric: 'distance', unit: 'km', defaultValue: '3', colorSlot: 3, weeklyTarget: 5 },
  { name: t('読書'), emoji: '📚', metric: 'reps', unit: t('ページ'), defaultValue: '10', colorSlot: 4, weeklyTarget: 5 },
  { name: t('100マス計算'), emoji: '✏️', metric: 'duration', unit: t('秒'), lowerIsBetter: true, colorSlot: 2, weeklyTarget: 5 },
  { name: t('勉強'), emoji: '📖', metric: 'duration', unit: t('分'), defaultValue: '30', colorSlot: 5, weeklyTarget: 5 },
  { name: t('瞑想'), emoji: '🧘', metric: 'duration', unit: t('分'), defaultValue: '10', colorSlot: 6, weeklyTarget: 7 },
  { name: t('ストレッチ'), emoji: '🤸', metric: 'none', colorSlot: 7, weeklyTarget: 7 },
  // 生活ログ: 統計の「デイリーサマリー」「気づき」で習慣との関係を見るための記録
  { name: t('睡眠'), emoji: '😴', metric: 'duration', unit: t('時間'), defaultValue: '7', colorSlot: 5, weeklyTarget: 7 },
  { name: t('仕事'), emoji: '💼', metric: 'duration', unit: t('時間'), defaultValue: '8', colorSlot: 3, weeklyTarget: 5 },
]

function HabitForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Form
  onSave: (f: Form) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="card">
      <div className="form-grid">
        <div className="form-row">
          <label>
            {t('名前')}
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('例: 筋トレ')}
            />
          </label>
          <label>
            {t('絵文字')}
            <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} />
          </label>
        </div>
        <label>
          {t('記録するもの')}
          <select
            value={form.metric}
            onChange={(e) => {
              const m = e.target.value as FormMetric
              const opt = metricOptions.find((o) => o.value === m)!
              setForm((f) => ({ ...f, metric: m, unit: opt.defaultUnit, lowerIsBetter: false }))
            }}
          >
            {metricOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {form.metric !== 'none' && form.metric !== 'strength' && (
          <div className="form-row">
            <label>
              {t('単位(km・分・ページ・問 など)')}
              <input value={form.unit} onChange={(e) => set('unit', e.target.value)} />
            </label>
            <label>
              {t('ワンタップ記録の既定値')}
              <input
                type="number"
                inputMode="decimal"
                value={form.defaultValue}
                onChange={(e) => set('defaultValue', e.target.value)}
              />
            </label>
          </div>
        )}
        {form.metric !== 'none' && form.metric !== 'strength' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={form.lowerIsBetter}
              onChange={(e) => set('lowerIsBetter', e.target.checked)}
            />
            {t('値が小さいほど良い(100マス計算のタイムなど)')}
          </label>
        )}
        <label>
          {t('週の目標回数')}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={14}
            value={form.weeklyTarget}
            onChange={(e) => set('weeklyTarget', Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label>
          {t('色')}
          <div className="color-picker">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={form.colorSlot === i ? 'selected' : ''}
                style={{ background: seriesVar(i) }}
                aria-label={`色 ${i + 1}`}
                onClick={() => set('colorSlot', i)}
              />
            ))}
          </div>
        </label>
        <button
          className="primary-btn"
          onClick={() => form.name.trim() && onSave(form)}
          disabled={!form.name.trim()}
        >
          {t('保存')}
        </button>
        <button className="secondary-btn" onClick={onCancel}>
          {t('キャンセル')}
        </button>
      </div>
    </div>
  )
}

export function HabitsView() {
  const { data, dispatch } = useStore()
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  // プリセット選択でフォームを作り直すためのシード(keyで再マウント)
  const [seed, setSeed] = useState<Form>(emptyForm)
  const [seedId, setSeedId] = useState(0)

  const save = (f: Form) => {
    const isStrength = f.metric === 'strength'
    const base = {
      name: f.name.trim(),
      emoji: f.emoji || '⭐',
      colorSlot: f.colorSlot,
      kind: (isStrength ? 'strength' : 'simple') as Habit['kind'],
      metric: (isStrength ? 'reps' : f.metric) as MetricType,
      unit: isStrength ? t('セット') : f.metric === 'none' ? '' : f.unit,
      weeklyTarget: f.weeklyTarget,
      defaultValue:
        isStrength || f.metric === 'none' ? undefined : Number(f.defaultValue) || undefined,
      lowerIsBetter: !isStrength && f.metric !== 'none' && f.lowerIsBetter ? true : undefined,
    }
    if (editing === 'new') {
      dispatch({ type: 'addHabit', habit: base })
    } else if (editing) {
      dispatch({ type: 'updateHabit', habit: { ...editing, ...base } })
    }
    setEditing(null)
  }

  const openPreset = (p: (typeof presets)[number] | null) => {
    setSeed({ ...emptyForm, ...(p ?? {}) })
    setSeedId((n) => n + 1)
    setEditing('new')
  }

  const recentEntries = [...data.entries]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20)
  const habitById = new Map(data.habits.map((h) => [h.id, h]))

  return (
    <>
      <header className="app-header">
        <h1>{t('習慣の管理')}</h1>
        <div className="date">{t('習慣と目標の追加・編集')}</div>
      </header>
      <main className="app-main">
        {editing === 'new' && (
          <div className="card">
            <p className="subtitle" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('プリセットから選ぶか、そのまま下で自由に作成')}
            </p>
            <div className="chip-row" style={{ flexWrap: 'wrap' }}>
              {presets.map((p) => (
                <button key={p.name} className="chip" onClick={() => openPreset(p)}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {editing && (
          <HabitForm
            key={editing === 'new' ? seedId : editing.id}
            initial={
              editing === 'new'
                ? seed
                : {
                    name: editing.name,
                    emoji: editing.emoji,
                    colorSlot: editing.colorSlot,
                    metric: editing.kind === 'strength' ? 'strength' : editing.metric,
                    unit: editing.unit,
                    weeklyTarget: editing.weeklyTarget,
                    defaultValue: editing.defaultValue?.toString() ?? '',
                    lowerIsBetter: editing.lowerIsBetter ?? false,
                  }
            }
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="card">
          {data.habits.map((h) => (
            <div key={h.id} className="habit-row">
              <span className="color-dot" style={{ background: seriesVar(h.colorSlot) }} />
              <span>{h.emoji}</span>
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tName(h.name)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('週{n}回', { n: h.weeklyTarget })}
                  {h.kind === 'strength'
                    ? t('・ 種目×セット×回数×重量を記録')
                    : h.metric !== 'none' &&
                      `${t('・ {u}を記録', { u: h.unit })}${h.lowerIsBetter ? t('(小さいほど良い)') : ''}`}
                </div>
              </div>
              <button className="text-btn" onClick={() => setEditing(h)}>
                {t('編集')}
              </button>
              <button
                className="text-btn danger"
                onClick={() => {
                  if (confirm(t('「{name}」と記録をすべて削除します。よろしいですか?', { name: tName(h.name) }))) {
                    dispatch({ type: 'deleteHabit', habitId: h.id })
                  }
                }}
              >
                {t('削除')}
              </button>
            </div>
          ))}
          {!editing && (
            <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => openPreset(null)}>
              {t('+ 習慣を追加')}
            </button>
          )}
        </div>

        <h2 className="section-title">{t('最近の記録')}</h2>
        <div className="card">
          {recentEntries.length === 0 && <p className="empty-note">{t('まだ記録がありません')}</p>}
          {recentEntries.map((e) => {
            const h = habitById.get(e.habitId)
            return (
              <div key={e.id} className="entry-row">
                <span>
                  {h?.emoji} {h ? tName(h.name) : t('(削除済み)')}
                  {e.exercise
                    ? ` ${t(e.exercise)} ${e.weight != null ? `${e.weight}kg×` : ''}${e.reps ?? '-'}×${e.sets ?? '-'}`
                    : e.value != null && ` ${e.value}${h?.unit ?? ''}`}
                  {e.note && ` — ${e.note}`}
                </span>
                <span className="meta">
                  {e.date.slice(5).replace('-', '/')} {e.time}
                  <button
                    className="text-btn danger"
                    onClick={() => dispatch({ type: 'deleteEntry', entryId: e.id })}
                  >
                    {t('削除')}
                  </button>
                </span>
              </div>
            )
          })}
        </div>

      </main>
    </>
  )
}
