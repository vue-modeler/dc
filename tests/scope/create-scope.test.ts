import { describe, expect, it, vi } from 'vitest'
import { getCurrentScope, onScopeDispose } from 'vue'

import { createScope } from '../../src/scope/create-scope'

describe('createScope', () => {
  it('returns a detached EffectScope that can register dispose and stop', () => {
    const dispose = vi.fn()
    const scope = createScope()

    expect(getCurrentScope()).toBeUndefined()

    scope.run(() => {
      expect(getCurrentScope()).toBe(scope)
      onScopeDispose(dispose)
    })

    expect(dispose).not.toHaveBeenCalled()
    scope.stop()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
