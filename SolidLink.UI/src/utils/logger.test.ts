import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearLogHistory,
  getLogHistory,
  log,
  logError,
  logWarn,
} from '../utils/logger'

describe('logger', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    clearLogHistory()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    vi.restoreAllMocks()
    clearLogHistory()
  })

  it('records log entries for info, warn, and error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    log('Bridge', 'connected', { port: 1234 })
    logWarn('Bridge', 'slow response')
    logError('Bridge', 'failed', new Error('boom'))

    const history = getLogHistory()
    expect(history).toHaveLength(3)
    expect(history[0]).toMatchObject({
      level: 'info',
      component: 'Bridge',
      message: 'connected',
      data: { port: 1234 },
    })
    expect(history[1]).toMatchObject({
      level: 'warn',
      component: 'Bridge',
      message: 'slow response',
    })
    expect(history[2]).toMatchObject({
      level: 'error',
      component: 'Bridge',
      message: 'failed',
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('caps log history at 500 entries', () => {
    for (let i = 0; i < 501; i += 1) {
      log('Test', `message-${i}`)
    }

    const history = getLogHistory()
    expect(history).toHaveLength(500)
    expect(history[0]?.message).toBe('message-1')
    expect(history[499]?.message).toBe('message-500')
  })

  it('clears log history', () => {
    log('UI', 'boot')
    expect(getLogHistory()).toHaveLength(1)

    clearLogHistory()
    expect(getLogHistory()).toHaveLength(0)
  })
})
