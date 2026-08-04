import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { thisWeekProgress } from './stats'
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
