import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSyncConfig } from './sync'

describe('getSyncConfig', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'localStorage',
      {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when there is no data', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null)
    expect(getSyncConfig()).toBeNull()
  })

  it('returns null and does not throw on invalid JSON', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('{ invalid json }')
    expect(getSyncConfig()).toBeNull()
  })

  it('returns null for an empty object', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({}))
    expect(getSyncConfig()).toBeNull()
  })

  it('parses legacy format with just token as gist', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ token: 'old-token' }))
    expect(getSyncConfig()).toEqual({
      provider: 'gist',
      token: 'old-token',
      gistId: undefined,
    })
  })

  it('parses legacy format with token and gistId as gist', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ token: 'old-token', gistId: 'some-id' })
    )
    expect(getSyncConfig()).toEqual({
      provider: 'gist',
      token: 'old-token',
      gistId: 'some-id',
    })
  })

  it('parses modern gist format', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ provider: 'gist', token: 'new-token' })
    )
    expect(getSyncConfig()).toEqual({
      provider: 'gist',
      token: 'new-token',
    })
  })

  it('returns null for modern gist format missing token', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ provider: 'gist', token: 123 })
    )
    expect(getSyncConfig()).toBeNull()
  })

  it('parses supabase format', () => {
    const config = { provider: 'supabase', session: { access_token: 'sb-token' } }
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(config))
    expect(getSyncConfig()).toEqual(config)
  })

  it('returns null for supabase format missing session.access_token', () => {
    const config = { provider: 'supabase', session: { refresh_token: 'refresh-only' } }
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(config))
    expect(getSyncConfig()).toBeNull()
  })

  it('returns null for unknown provider', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ provider: 'unknown', data: 'something' })
    )
    expect(getSyncConfig()).toBeNull()
  })
})
