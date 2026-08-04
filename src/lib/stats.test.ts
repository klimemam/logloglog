import { describe, it, expect } from 'vitest'
import { currentStreak, type DayAgg } from './stats'

describe('currentStreak', () => {
  const TODAY = '2026-08-04'

  const mockByDay = (dates: string[]): Map<string, DayAgg> => {
    const map = new Map<string, DayAgg>()
    dates.forEach(d => {
      map.set(d, { count: 1, value: 1 })
    })
    return map
  }

  it('should return 0 when there are no entries', () => {
    const byDay = mockByDay([])
    expect(currentStreak(byDay, TODAY)).toBe(0)
  })

  it('should count streak including today', () => {
    const byDay = mockByDay(['2026-08-04', '2026-08-03', '2026-08-02'])
    expect(currentStreak(byDay, TODAY)).toBe(3)
  })

  it('should count streak if there is an entry yesterday but not today', () => {
    const byDay = mockByDay(['2026-08-03', '2026-08-02'])
    expect(currentStreak(byDay, TODAY)).toBe(2)
  })

  it('should return 0 if the streak was broken the day before yesterday', () => {
    const byDay = mockByDay(['2026-08-02', '2026-08-01'])
    expect(currentStreak(byDay, TODAY)).toBe(0)
  })

  it('should handle long streaks', () => {
    const byDay = mockByDay([
      '2026-08-04', '2026-08-03', '2026-08-02', '2026-08-01',
      '2026-07-31', '2026-07-30', '2026-07-29', '2026-07-28',
      '2026-07-27', '2026-07-26'
    ])
    expect(currentStreak(byDay, TODAY)).toBe(10)
  })

  it('should stop counting at a gap in the streak', () => {
    // Gap on 2026-08-01
    const byDay = mockByDay(['2026-08-04', '2026-08-03', '2026-08-02', '2026-07-31'])
    expect(currentStreak(byDay, TODAY)).toBe(3)
  })

  it('should ignore entries in the future', () => {
    const byDay = mockByDay(['2026-08-05', '2026-08-04', '2026-08-03'])
    expect(currentStreak(byDay, TODAY)).toBe(2)
  })
})
