import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aggregateByDay, currentStreak, thisWeekProgress, type DayAgg } from './stats'
import { Habit, Entry } from '../types'

describe('thisWeekProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('quit habit: created this week, no slips', () => {
    // 2024-10-10 is Thursday. Week starts on 2024-10-07 (Monday)
    vi.setSystemTime(new Date(2024, 9, 10))

    const habit: Habit = {
      id: 'h1',
      name: 'Quit Smoking',
      emoji: '🚬',
      colorSlot: 0,
      kind: 'quit',
      metric: 'none',
      unit: '',
      weeklyTarget: 7,
      createdAt: '2024-10-09T10:00:00Z',
    }

    const result = thisWeekProgress([], habit)
    expect(result).toEqual({ count: 2, value: 2, target: 7, done: false })
  })

  it('quit habit: created before this week, no slips', () => {
    vi.setSystemTime(new Date(2024, 9, 10))

    const habit: Habit = {
      id: 'h1',
      name: 'Quit Smoking',
      emoji: '🚬',
      colorSlot: 0,
      kind: 'quit',
      metric: 'none',
      unit: '',
      weeklyTarget: 7,
      createdAt: '2024-10-01T10:00:00Z',
    }

    const result = thisWeekProgress([], habit)
    expect(result).toEqual({ count: 4, value: 4, target: 7, done: false })
  })

  it('quit habit: created before this week, with slips on specific days', () => {
    vi.setSystemTime(new Date(2024, 9, 10))

    const habit: Habit = {
      id: 'h1',
      name: 'Quit Smoking',
      emoji: '🚬',
      colorSlot: 0,
      kind: 'quit',
      metric: 'none',
      unit: '',
      weeklyTarget: 7,
      createdAt: '2024-10-01T10:00:00Z',
    }

    const entries: Entry[] = [
      { id: 'e1', habitId: 'h1', date: '2024-10-08', time: '10:00', createdAt: '' }, // slip on Tuesday
      { id: 'e2', habitId: 'h1', date: '2024-10-01', time: '10:00', createdAt: '' }, // slip before this week
    ]

    const result = thisWeekProgress(entries, habit)
    expect(result).toEqual({ count: 3, value: 3, target: 7, done: false })
  })

  it('quit habit: done threshold logic (7 clean days)', () => {
    vi.setSystemTime(new Date(2024, 9, 13)) // Sunday

    const habit: Habit = {
      id: 'h1',
      name: 'Quit Smoking',
      emoji: '🚬',
      colorSlot: 0,
      kind: 'quit',
      metric: 'none',
      unit: '',
      weeklyTarget: 7,
      createdAt: '2024-10-01T10:00:00Z',
    }

    const result = thisWeekProgress([], habit)
    expect(result).toEqual({ count: 7, value: 7, target: 7, done: true })
  })

  it('regular habit: counts entries within the current week', () => {
    vi.setSystemTime(new Date(2024, 9, 10))

    const habit: Habit = {
      id: 'h1',
      name: 'Running',
      emoji: '🏃',
      colorSlot: 0,
      kind: 'simple',
      metric: 'distance',
      unit: 'km',
      weeklyTarget: 3,
      createdAt: '2024-10-01T10:00:00Z',
    }

    const entries: Entry[] = [
      { id: 'e1', habitId: 'h1', date: '2024-10-07', time: '10:00', value: 5, createdAt: '' },
      { id: 'e2', habitId: 'h1', date: '2024-10-09', time: '10:00', value: 3, createdAt: '' },
      { id: 'e3', habitId: 'h1', date: '2024-10-10', time: '10:00', value: 2, createdAt: '' },
      { id: 'e4', habitId: 'h1', date: '2024-10-06', time: '10:00', value: 10, createdAt: '' }, // Previous week
      { id: 'e5', habitId: 'h2', date: '2024-10-08', time: '10:00', value: 5, createdAt: '' }, // Different habit
    ]

    const result = thisWeekProgress(entries, habit)
    expect(result).toEqual({ count: 3, value: 10, target: 3, done: true })
  })

  it('regular habit: accurately sums up value and handles missing value', () => {
    vi.setSystemTime(new Date(2024, 9, 10))

    const habit: Habit = {
      id: 'h1',
      name: 'Reading',
      emoji: '📚',
      colorSlot: 0,
      kind: 'simple',
      metric: 'none',
      unit: '',
      weeklyTarget: 5,
      createdAt: '2024-10-01T10:00:00Z',
    }

    const entries: Entry[] = [
      { id: 'e1', habitId: 'h1', date: '2024-10-07', time: '10:00', createdAt: '' }, // No value
      { id: 'e2', habitId: 'h1', date: '2024-10-09', time: '10:00', value: 1, createdAt: '' },
    ]

    const result = thisWeekProgress(entries, habit)
    expect(result).toEqual({ count: 2, value: 1, target: 5, done: false })
  })
})

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

describe('aggregateByDay', () => {
  it('should return an empty map for an empty array', () => {
    const result = aggregateByDay([])
    expect(result.size).toBe(0)
  })

  it('should aggregate entries by day with correct counts and values', () => {
    const entries: Entry[] = [
      { id: '1', habitId: 'h1', date: '2023-01-01', time: '10:00', value: 10, createdAt: '2023-01-01' },
      { id: '2', habitId: 'h1', date: '2023-01-01', time: '11:00', value: 5, createdAt: '2023-01-01' },
      { id: '3', habitId: 'h1', date: '2023-01-02', time: '12:00', value: 20, createdAt: '2023-01-02' },
    ]

    const result = aggregateByDay(entries)

    expect(result.size).toBe(2)

    const day1 = result.get('2023-01-01')
    expect(day1).toBeDefined()
    expect(day1?.count).toBe(2)
    expect(day1?.value).toBe(15)

    const day2 = result.get('2023-01-02')
    expect(day2).toBeDefined()
    expect(day2?.count).toBe(1)
    expect(day2?.value).toBe(20)
  })

  it('should handle entries with missing values', () => {
    const entries: Entry[] = [
      { id: '1', habitId: 'h1', date: '2023-01-01', time: '10:00', createdAt: '2023-01-01' },
      { id: '2', habitId: 'h1', date: '2023-01-01', time: '11:00', value: 5, createdAt: '2023-01-01' },
    ]

    const result = aggregateByDay(entries)

    expect(result.size).toBe(1)

    const day1 = result.get('2023-01-01')
    expect(day1).toBeDefined()
    expect(day1?.count).toBe(2)
    expect(day1?.value).toBe(5)
  })
})
