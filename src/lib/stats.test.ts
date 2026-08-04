import { describe, it, expect } from 'vitest'
import { aggregateByDay } from './stats'
import type { Entry } from '../types'

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
