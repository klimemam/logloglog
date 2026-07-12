import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { AppData, Habit, MetricType } from '../types'
import { seriesVar } from './HomeView'

const metricOptions: { value: MetricType; label: string; defaultUnit: string }[] = [
  { value: 'none', label: 'やった/やらない だけ', defaultUnit: '' },
  { value: 'duration', label: '時間を記録(分)', defaultUnit: '分' },
  { value: 'distance', label: '距離を記録(km)', defaultUnit: 'km' },
  { value: 'reps', label: '回数を記録(回)', defaultUnit: '回' },
]

const emptyForm = {
  name: '',
  emoji: '⭐',
  colorSlot: 2,
  metric: 'none' as MetricType,
  unit: '',
  weeklyTarget: 3,
  defaultValue: '',
}

type Form = typeof emptyForm

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
              const m = e.target.value as MetricType
              const opt = metricOptions.find((o) => o.value === m)!
              setForm((f) => ({ ...f, metric: m, unit: opt.defaultUnit }))
            }}
          >
            {metricOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
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
          {form.metric !== 'none' && (
            <label>
              ワンタップ記録の既定値({form.unit})
              <input
                type="number"
                inputMode="decimal"
                value={form.defaultValue}
                onChange={(e) => set('defaultValue', e.target.value)}
              />
            </label>
          )}
        </div>
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
  const fileRef = useRef<HTMLInputElement>(null)

  const save = (f: Form) => {
    const base = {
      name: f.name.trim(),
      emoji: f.emoji || '⭐',
      colorSlot: f.colorSlot,
      metric: f.metric,
      unit: f.metric === 'none' ? '' : f.unit,
      weeklyTarget: f.weeklyTarget,
      defaultValue: f.metric === 'none' ? undefined : Number(f.defaultValue) || undefined,
    }
    if (editing === 'new') {
      dispatch({ type: 'addHabit', habit: base })
    } else if (editing) {
      dispatch({ type: 'updateHabit', habit: { ...editing, ...base } })
    }
    setEditing(null)
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
        {editing && (
          <HabitForm
            initial={
              editing === 'new'
                ? emptyForm
                : {
                    name: editing.name,
                    emoji: editing.emoji,
                    colorSlot: editing.colorSlot,
                    metric: editing.metric,
                    unit: editing.unit,
                    weeklyTarget: editing.weeklyTarget,
                    defaultValue: editing.defaultValue?.toString() ?? '',
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
                  {h.metric !== 'none' && ` ・ ${h.unit}を記録`}
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
            <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => setEditing('new')}>
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
                  {e.value != null && ` ${e.value}${h?.unit ?? ''}`}
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
