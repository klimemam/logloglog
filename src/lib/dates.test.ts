import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  toDateKey,
  fromDateKey,
  todayKey,
  addDays,
  weekStartKey,
  recentWeekStarts,
  formatDateShort,
  formatDateLong,
  nowTime
} from './dates'
import * as i18n from './i18n'

describe('dates utils', () => {
  describe('toDateKey', () => {
    it('formats a date to YYYY-MM-DD padding single digits', () => {
      const date = new Date(2024, 0, 5) // Jan 5, 2024
      expect(toDateKey(date)).toBe('2024-01-05')
    })
    it('formats a date to YYYY-MM-DD without padding double digits', () => {
      const date = new Date(2024, 10, 15) // Nov 15, 2024
      expect(toDateKey(date)).toBe('2024-11-15')
    })
  })

  describe('fromDateKey', () => {
    it('parses YYYY-MM-DD into a Date object', () => {
      const date = fromDateKey('2024-01-05')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // 0-indexed month
      expect(date.getDate()).toBe(5)
    })
  })

  describe('todayKey', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2023, 4, 12)) // May 12, 2023
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns the current date as a key', () => {
      expect(todayKey()).toBe('2023-05-12')
    })
  })

  describe('addDays', () => {
    it('adds positive days correctly', () => {
      expect(addDays('2024-02-28', 2)).toBe('2024-03-01') // leap year
    })
    it('adds negative days correctly', () => {
      expect(addDays('2024-03-01', -2)).toBe('2024-02-28') // leap year
    })
  })

  describe('weekStartKey', () => {
    it('returns the Monday of the given week', () => {
      // 2024-05-15 is a Wednesday
      expect(weekStartKey('2024-05-15')).toBe('2024-05-13') // Monday

      // 2024-05-12 is a Sunday
      expect(weekStartKey('2024-05-12')).toBe('2024-05-06') // Previous Monday

      // 2024-05-13 is a Monday
      expect(weekStartKey('2024-05-13')).toBe('2024-05-13') // Same day
    })
  })

  describe('recentWeekStarts', () => {
    it('returns n previous week Monday keys including this week', () => {
      // Assuming 'from' is a Wednesday '2024-05-15', this week's Monday is '2024-05-13'
      const weeks = recentWeekStarts(3, '2024-05-15')
      expect(weeks).toEqual([
        '2024-04-29', // 2 weeks ago
        '2024-05-06', // 1 week ago
        '2024-05-13'  // this week
      ])
    })
  })

  describe('formatDateShort', () => {
    it('formats a date key into M/D', () => {
      expect(formatDateShort('2024-01-05')).toBe('1/5')
      expect(formatDateShort('2024-11-15')).toBe('11/15')
    })
  })

  describe('formatDateLong', () => {
    let mockLocaleTag: any
    beforeEach(() => {
      mockLocaleTag = vi.spyOn(i18n, 'localeTag').mockReturnValue('en-US')
    })
    afterEach(() => {
      mockLocaleTag.mockRestore()
    })

    it('formats a date key according to locale', () => {
      // Use en-US format
      const res = formatDateLong('2024-05-15')
      // Intl.DateTimeFormat with { month: 'numeric', day: 'numeric', weekday: 'short' }
      // for en-US yields e.g. "Wed, 5/15" depending on the engine, but let's check for containing values or exact Node output
      expect(res).toBe('Wed, 5/15')
    })
  })

  describe('nowTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Set to 08:05 to test padding
      const d = new Date()
      d.setHours(8, 5)
      vi.setSystemTime(d)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns the current time in HH:MM padded format', () => {
      expect(nowTime()).toBe('08:05')
    })
  })
})

describe('weekStartKey', () => {
  it('returns the same day if it is already Monday', () => {
    // 2024-01-01 is a Monday
    expect(weekStartKey('2024-01-01')).toBe('2024-01-01')
    // 2024-11-25 is a Monday
    expect(weekStartKey('2024-11-25')).toBe('2024-11-25')
  })

  it('returns the previous Monday for a Sunday', () => {
    // 2024-01-07 is a Sunday, the start of its week should be 2024-01-01 (Monday)
    expect(weekStartKey('2024-01-07')).toBe('2024-01-01')
    // 2024-11-24 is a Sunday, its week start is 2024-11-18
    expect(weekStartKey('2024-11-24')).toBe('2024-11-18')
  })

  it('returns the previous Monday for mid-week days', () => {
    // 2024-01-03 is a Wednesday, its week start is 2024-01-01
    expect(weekStartKey('2024-01-03')).toBe('2024-01-01')
    // 2024-01-05 is a Friday, its week start is 2024-01-01
    expect(weekStartKey('2024-01-05')).toBe('2024-01-01')
    // 2024-01-06 is a Saturday, its week start is 2024-01-01
    expect(weekStartKey('2024-01-06')).toBe('2024-01-01')
  })

  it('handles cross-month boundaries correctly', () => {
    // 2024-02-02 is a Friday, its week start is 2024-01-29 (Monday)
    expect(weekStartKey('2024-02-02')).toBe('2024-01-29')
    // 2024-05-01 is a Wednesday, its week start is 2024-04-29 (Monday)
    expect(weekStartKey('2024-05-01')).toBe('2024-04-29')
  })

  it('handles cross-year boundaries correctly', () => {
    // 2024-01-02 (Tuesday) in 2024, week start is 2024-01-01
    expect(weekStartKey('2024-01-02')).toBe('2024-01-01')

    // 2023-01-01 is a Sunday, its week start should be 2022-12-26 (Monday)
    expect(weekStartKey('2023-01-01')).toBe('2022-12-26')

    // 2025-01-01 is a Wednesday, its week start is 2024-12-30 (Monday)
    expect(weekStartKey('2025-01-01')).toBe('2024-12-30')
  })

  it('handles leap year edge cases correctly', () => {
    // 2024-02-29 is a Thursday (leap year), its week start is 2024-02-26 (Monday)
    expect(weekStartKey('2024-02-29')).toBe('2024-02-26')
    // 2024-03-01 is a Friday, its week start is 2024-02-26 (Monday)
    expect(weekStartKey('2024-03-01')).toBe('2024-02-26')
  })
})
