import { vi, describe, it, expect, beforeEach } from 'vitest'
import { checkForUpdate } from './update'
import { App } from '@capacitor/app'
import * as backend from './backend'

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
  },
}))

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(),
  },
}))

vi.mock('./backend', () => ({
  isNativeApp: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('update', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(backend.isNativeApp).mockReturnValue(true)
  })

  describe('checkForUpdate - checkNative', () => {
    it('should handle App.getInfo error fallback correctly', async () => {
      // Mock App.getInfo to throw an error
      vi.mocked(App.getInfo).mockRejectedValue(new Error('Plugin not available'))

      // Mock fetch to return a newer version (10)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'v1.0.10' }),
      })

      const result = await checkForUpdate()

      // When error is caught, currentCode becomes 0, and current is t('不明')
      // default language is english, so 'Unknown'
      expect(result).toEqual({
        available: true, // 10 > 0
        current: 'Unknown',
        latest: 'v1.0.10',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/klimemam/logloglog/releases/tags/android-latest'
      )
    })

    it('should return available: false if API response format is unexpected', async () => {
      vi.mocked(App.getInfo).mockResolvedValue({ build: '5', version: '1.0' } as any)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'invalid-format' }),
      })

      const result = await checkForUpdate()

      expect(result).toEqual({
        available: false,
        current: 'v1.0',
      })
    })

    it('should handle success with newer version', async () => {
      vi.mocked(App.getInfo).mockResolvedValue({ build: '5', version: '1.0' } as any)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'v1.1.10' }),
      })

      const result = await checkForUpdate()

      expect(result).toEqual({
        available: true,
        current: 'v1.0',
        latest: 'v1.1.10',
      })
    })

    it('should handle success with older/equal version', async () => {
      vi.mocked(App.getInfo).mockResolvedValue({ build: '10', version: '1.1' } as any)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'v1.1.5' }),
      })

      const result = await checkForUpdate()

      expect(result).toEqual({
        available: false,
        current: 'v1.1',
        latest: 'v1.1.5',
      })
    })
  })
})
