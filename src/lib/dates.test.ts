import { describe, it, expect } from 'vitest'
import { weekStartKey } from './dates'

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
