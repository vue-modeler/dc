import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, onScopeDispose } from 'vue'

import { Descriptor } from '../../src/container/descriptor'
import type { DependencyContainer } from '../../src/types'

vi.mock('vue', () => ({
  effectScope: vi.fn(),
  onScopeDispose: vi.fn(),
}))

describe('Descriptor', () => {
  const destructor = vi.fn()
  const dc = {
    resolve: vi.fn(),
    get size (): number {
      return 0
    },
  } as unknown as DependencyContainer
  let factory: ReturnType<typeof vi.fn>
  let scope: {
    run: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    destructor.mockReset()
    factory = vi.fn(() => ({ destructor }))
    scope = {
      run: vi.fn((runner: () => unknown) => runner()),
      stop: vi.fn(),
    }

    vi.mocked(onScopeDispose).mockReset()
    vi.mocked(effectScope).mockReturnValue(scope as never)
  })

  it('creates an instance inside a detached effect scope', () => {
    const descriptor = new Descriptor(dc, factory)

    expect(effectScope).toHaveBeenCalledWith(true)
    expect(scope.run).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledWith({ dc })
    expect(descriptor.instance).toEqual({ destructor })
  })

  it('throws when factory returns nothing', () => {
    factory.mockReturnValue(undefined)

    expect(() => new Descriptor(dc, factory)).toThrow(
      'Factory has not created model instance',
    )
  })

  it('throws when factory returns a promise', () => {
    factory.mockReturnValue(Promise.resolve({}))

    expect(() => new Descriptor(dc, factory)).toThrow(
      'Dependency factory must be synchronous and must not return a Promise',
    )
  })

  it('tracks parent scopes and disposes only after the last one stops', () => {
    const descriptor = new Descriptor(dc, factory)

    descriptor.subscribeOnParentScopeDispose(onScopeDispose)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose)

    const firstDispose = vi.mocked(onScopeDispose).mock.calls[0][0] as () => void
    const secondDispose = vi.mocked(onScopeDispose).mock.calls[1][0] as () => void

    firstDispose()
    expect(descriptor.parentScopeCount).toBe(1)
    expect(scope.stop).not.toHaveBeenCalled()
    expect(destructor).not.toHaveBeenCalled()

    secondDispose()
    expect(descriptor.parentScopeCount).toBe(0)
    expect(scope.stop).toHaveBeenCalledTimes(1)
    expect(destructor).toHaveBeenCalledTimes(1)
  })

  it('disposes the current instance immediately when replaced', () => {
    const descriptor = new Descriptor(dc, factory)

    descriptor.subscribeOnParentScopeDispose(onScopeDispose)
    descriptor.disposeForReplace()

    expect(scope.stop).toHaveBeenCalledTimes(1)
    expect(destructor).toHaveBeenCalledTimes(1)
    expect(descriptor.parentScopeCount).toBe(0)
  })
})
