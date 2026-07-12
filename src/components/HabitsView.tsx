import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { AppData, Habit, MetricType } from '../types'
import { seriesVar } from './HomeView'

/** フォーム上の「記録するもの」。strength は保存時に kind: 'strength' へ変換される */
type FormMetric = MetricType | 'strength'

const metricOptions: { value: FormMetric; label: string; defaultUnit: string }[] = [
  { value: 'none', label: 'やった/やらない だけ', defaultUnit: '' },
  { value: 'duration', label: '時間(分)', defaultUnit: '分' },
  { value: 'distance', label: '距離(km)', defaultUnit: 'km' },
  { value: 'reps', label: '量(回・ページなど自由な単位)', defaultUnit: '回' },
  { value: 'strength', label: '筋トレ(種目×セット×回数×重量)', defaultUnit: 'セット' },
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
  { name: '筋トレ', emoji: '💪', metric: 'strength', colorSlot: 0, weeklyTarget: 3 },
  { name: 'ランニング', emoji: '🏃', metric: 'distance', unit: 'km', defaultValue: '5', colorSlot: 1, weeklyTarget: 2 },
  { name: 'ウォーキング', emoji: '🚶', metric: 'distance', unit: 'km', defaultValue: '3', colorSlot: 3, weeklyTarget: 5 },
  { name: '読書', emoji: '📚', metric: 'reps', unit: 'ページ', defaultValue: '10', colorSlot: 4, weeklyTarget: 5 },
  { name: '100マス計算', emoji: '✏️', metric: 'duration', unit: '秒', lowerIsBetter: true, colorSlot: 2, weeklyTarget: 5 },
  { name: '勉強', emoji: '📖', metric: 'duration', unit: '分', defaultValue: '30', colorSlot: 5, weeklyTarget: 5 },
  { name: '瞑想', emoji: '🧘', metric: 'duration', unit: '分', defaultValue: '10', colorSlot: 6, weeklyTarget: 7 },
  { name: 'ストレッチ', emoji: '🤸', metric: 'none', colorSlot: 7, weeklyTarget: 7 },
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
            名前
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例: 筋トレ"
            />
          </label>
          <label>
            絵文字
            <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} />
          </label>
        </div>
        <label>
          記録するもの
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
              単位(km・分・ページ・問 など)
              <input value={form.unit} onChange={(e) => set('unit', e.target.value)} />
            </label>
            <label>
              ワンタップ記録の既定値
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
            値が小さいほど良い(100マス計算のタイムなど)
          </label>
        )}
        <label>
          週の目標回数
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
          色
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
          保存
        </button>
        <button className="secondary-btn" onClick={onCancel}>
          キャンセル
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
  const fileRef = useRef<HTMLInputElement>(null)

  const save = (f: Form) => {
    const isStrength = f.metric === 'strength'
    const base = {
      name: f.name.trim(),
      emoji: f.emoji || '⭐',
      colorSlot: f.colorSlot,
      kind: (isStrength ? 'strength' : 'simple') as Habit['kind'],
      metric: (isStrength ? 'reps' : f.metric) as MetricType,
      unit: isStrength ? 'セット' : f.metric === 'none' ? '' : f.unit,
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

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logloglog-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (parsed.version === 1 && Array.isArray(parsed.habits) && Array.isArray(parsed.entries)) {
          if (confirm('現在のデータをインポート内容で置き換えます。よろしいですか?')) {
            dispatch({ type: 'import', data: parsed })
          }
        } else {
          alert('ファイル形式が正しくありません')
        }
      } catch {
        alert('ファイルを読み込めませんでした')
      }
    }
    reader.readAsText(file)
  }

  const recentEntries = [...data.entries]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20)
  const habitById = new Map(data.habits.map((h) => [h.id, h]))

  return (
    <>
      <header className="app-header">
        <h1>習慣の管理</h1>
        <div className="date">習慣・目標の編集とデータの管理</div>
      </header>
      <main className="app-main">
        {editing === 'new' && (
          <div className="card">
            <p className="subtitle" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              プリセットから選ぶか、そのまま下で自由に作成
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
                <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  週{h.weeklyTarget}回
                  {h.kind === 'strength'
                    ? ' ・ 種目×セット×回数×重量を記録'
                    : h.metric !== 'none' &&
                      ` ・ ${h.unit}を記録${h.lowerIsBetter ? '(小さいほど良い)' : ''}`}
                </div>
              </div>
              <button className="text-btn" onClick={() => setEditing(h)}>
                編集
              </button>
              <button
                className="text-btn danger"
                onClick={() => {
                  if (confirm(`「${h.name}」と記録をすべて削除します。よろしいですか?`)) {
                    dispatch({ type: 'deleteHabit', habitId: h.id })
                  }
                }}
              >
                削除
              </button>
            </div>
          ))}
          {!editing && (
            <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => openPreset(null)}>
              + 習慣を追加
            </button>
          )}
        </div>

        <h2 className="section-title">最近の記録</h2>
        <div className="card">
          {recentEntries.length === 0 && <p className="empty-note">まだ記録がありません</p>}
          {recentEntries.map((e) => {
            const h = habitById.get(e.habitId)
            return (
              <div key={e.id} className="entry-row">
                <span>
                  {h?.emoji} {h?.name ?? '(削除済み)'}
                  {e.exercise
                    ? ` ${e.exercise} ${e.weight != null ? `${e.weight}kg×` : ''}${e.reps ?? '-'}回×${e.sets ?? '-'}セット`
                    : e.value != null && ` ${e.value}${h?.unit ?? ''}`}
                  {e.note && ` — ${e.note}`}
                </span>
                <span className="meta">
                  {e.date.slice(5).replace('-', '/')} {e.time}
                  <button
                    className="text-btn danger"
                    onClick={() => dispatch({ type: 'deleteEntry', entryId: e.id })}
                  >
                    削除
                  </button>
                </span>
              </div>
            )
          })}
        </div>

        <h2 className="section-title">データ</h2>
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <button className="secondary-btn" onClick={exportData}>
            エクスポート(JSON)
          </button>
          <button className="secondary-btn" onClick={() => fileRef.current?.click()}>
            インポート
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            データはこの端末のブラウザ内にのみ保存されます。機種変更やブラウザ変更の前にエクスポートしてください。
          </p>
        </div>
      </main>
    </>
  )
}
