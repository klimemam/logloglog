import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSyncConfig, loadSyncConfig } from './sync'

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

  it('returns null when there is no data', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null)
    await loadSyncConfig()
    expect(getSyncConfig()).toBeNull()
  })

  it('returns null and does not throw on invalid JSON', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('{ invalid json }')
    await loadSyncConfig()
    expect(getSyncConfig()).toBeNull()
  })

  it('returns null for an empty object', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({}))
    await loadSyncConfig()
    expect(getSyncConfig()).toBeNull()
  })

  it('parses legacy format with just token as gist', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ token: 'old-token' }))
    await loadSyncConfig()
    expect(getSyncConfig()).toEqual({
      provider: 'gist',
      token: 'old-token',
      gistId: undefined,
    })
  })

  it('parses legacy format with token and gistId as gist', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ token: 'old-token', gistId: 'some-id' })
    )
    await loadSyncConfig()
    expect(getSyncConfig()).toEqual({
      provider: 'gist',
      token: 'old-token',
      gistId: 'some-id',
    })
  })

  it('parses modern gist format', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ provider: 'gist', token: 'new-token' })
    )
    await loadSyncConfig()
    expect(getSyncConfig()).toEqual({
      provider: 'gist',
      token: 'new-token',
    })
  })

  it('returns null for modern gist format missing token', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ provider: 'gist', token: 123 })
    )
    await loadSyncConfig()
    expect(getSyncConfig()).toBeNull()
  })

  it('parses supabase format', async () => {
    const config = { provider: 'supabase', session: { access_token: 'sb-token' } }
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(config))
    await loadSyncConfig()
    expect(getSyncConfig()).toEqual(config)
  })

  it('returns null for supabase format missing session.access_token', async () => {
    const config = { provider: 'supabase', session: { refresh_token: 'refresh-only' } }
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(config))
    await loadSyncConfig()
    expect(getSyncConfig()).toBeNull()
  })

  it('returns null for unknown provider', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ provider: 'unknown', data: 'something' })
    )
    await loadSyncConfig()
    expect(getSyncConfig()).toBeNull()
  })
})
