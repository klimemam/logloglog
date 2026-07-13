import { useStore } from '../store'
import { formatDateLong } from '../lib/dates'
import { t, tName } from '../lib/i18n'
import { Sheet } from './Sheet'
import { seriesVar } from './HomeView'

/** デイリーサマリーのセルをタップしたときに開く、その日の記録一覧シート */
export function DayDetailSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data } = useStore()
  const habitById = new Map(data.habits.map((h) => [h.id, h]))
  const entries = date
    ? data.entries.filter((e) => e.date === date).sort((a, b) => (a.time < b.time ? -1 : 1))
    : []

  return (
    <Sheet open={date != null} title={date ? formatDateLong(date) : ''} onClose={onClose}>
      {entries.length === 0 ? (
        <p className="empty-note">{t('記録なし')}</p>
      ) : (
        <div className="day-detail">
          {entries.map((e) => {
            const h = habitById.get(e.habitId)
            if (!h) return null
            return (
              <div key={e.id} className="day-detail-row">
                <span
                  className="picker-tile"
                  style={{
                    background: `color-mix(in srgb, ${seriesVar(h.colorSlot)} 14%, transparent)`,
                  }}
                >
                  {h.emoji}
                </span>
                <span className="day-detail-main">
                  <b>
                    {tName(h.name)}
                    {e.exercise ? ` ・ ${t(e.exercise)}` : ''}
                  </b>
                  <small>
                    {e.time}
                    {e.setsDetail?.length
                      ? ` ・ ${e.setsDetail.map((s) => `${s.weight != null ? `${s.weight}kg×` : ''}${s.reps}`).join(' / ')}`
                      : e.value != null
                        ? ` ・ ${e.value}${h.unit}`
                        : ''}
                    {e.note ? ` ・ ${e.note}` : ''}
                  </small>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
