import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, inject } from 'vue'

import { provider } from '../../src/provider/provider'
import { isProvider } from '../../src/provider/is-provider'
import { DescriptorContainer } from '../../src/container/descriptor-container'
import type { DepFactory, DependencyContainer } from '../../src/types'

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    inject: vi.fn(),
  }
})

describe('provider', () => {
  let container: DescriptorContainer

  beforeEach(() => {
    container = new DescriptorContainer()
    vi.mocked(inject).mockReset()
    vi.mocked(inject).mockReturnValue(container)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns a provider function with metadata', () => {
    const useDependency = provider(() => 'test')

    expect(useDependency).toBeInstanceOf(Function)
    expect(isProvider(useDependency)).toBe(true)
    expect(typeof useDependency.redefine).toBe('function')
    expect(typeof useDependency.asKey).toBe('symbol')
  })

  it('uses the custom key when provided', () => {
    const key = Symbol('custom')
    const useDependency = provider(() => 'test', { key })

    expect(useDependency.asKey).toBe(key)
  })

  it('shares one instance per injected container and removes it after the last scope stops', () => {
    const instance = { id: 'shared' }
    const useDependency = provider(() => instance)
    const deleteSpy = vi.spyOn(container, 'delete')

    const scopeA = effectScope(true)
    const scopeB = effectScope(true)
    const first = scopeA.run(() => useDependency())
    const second = scopeB.run(() => useDependency())

    expect(first).toBe(instance)
    expect(second).toBe(instance)
    expect(container.size).toBe(1)

    scopeA.stop()
    expect(container.size).toBe(1)
    expect(deleteSpy).not.toHaveBeenCalled()

    scopeB.stop()
    expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
    expect(container.size).toBe(0)
  })

  it('keeps persistent instances after scope disposal', () => {
    const instance = { id: 'persistent' }
    const useDependency = provider(() => instance, { persistentInstance: true })
    const deleteSpy = vi.spyOn(container, 'delete')

    const scopeA = effectScope(true)
    const scopeB = effectScope(true)
    const first = scopeA.run(() => useDependency())
    const second = scopeB.run(() => useDependency())

    scopeA.stop()
    scopeB.stop()

    expect(first).toBe(instance)
    expect(second).toBe(instance)
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(container.get(useDependency)?.instance).toBe(instance)
  })

  it('does not bind container.resolve to a Vue scope when none is active', () => {
    const instance = { id: 'resolved' }
    const useDependency = provider(() => instance)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const deleteSpy = vi.spyOn(container, 'delete')

    expect(container.resolve(useDependency)).toBe(instance)
    expect(container.get(useDependency)?.instance).toBe(instance)
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('passes the previous factory to redefine before first resolve', () => {
    interface DependencyValue {
      currentContainer: DependencyContainer
      previousValue: string
    }

    let baseCalls = 0
    let replacementCalls = 0

    const baseFactory: DepFactory<DependencyValue> = ({ dc }) => {
      baseCalls++

      return {
        currentContainer: dc,
        previousValue: 'base',
      }
    }

    const useDependency = provider(baseFactory)
    const replacementFactory: DepFactory<DependencyValue> = ({ dc, prevFactory }) => {
      replacementCalls++

      return {
        currentContainer: dc,
        previousValue: prevFactory?.({ dc }).previousValue ?? 'missing',
      }
    }

    useDependency.redefine(replacementFactory)

    const result = effectScope(true).run(() => useDependency())

    expect(result).toEqual({
      currentContainer: container,
      previousValue: 'base',
    })
    expect(baseCalls).toBe(1)
    expect(replacementCalls).toBe(1)
  })

  it('throws when redefine happens after the descriptor exists in the same container', () => {
    const useDependency = provider(() => ({ id: 'initial' }))
    const scope = effectScope(true)

    scope.run(() => useDependency())
    useDependency.redefine(() => ({ id: 'redefined' }))

    expect(() => effectScope(true).run(() => useDependency())).toThrow(
      'Provider was redefine after creation instance',
    )

    scope.stop()
  })

  it('allows redefine after the previous scoped instance was disposed', () => {
    const useDependency = provider(() => ({ id: 'initial' }))
    const firstScope = effectScope(true)

    firstScope.run(() => useDependency())
    firstScope.stop()

    useDependency.redefine(() => ({ id: 'redefined' }))

    const secondScope = effectScope(true)
    const result = secondScope.run(() => useDependency())

    expect(result).toEqual({ id: 'redefined' })
    secondScope.stop()
  })

  it('throws for a persistent instance redefined after first creation', () => {
    const useDependency = provider(() => ({ id: 'persistent' }), {
      persistentInstance: true,
    })

    effectScope(true).run(() => useDependency())
    useDependency.redefine(() => ({ id: 'redefined' }))

    expect(() => effectScope(true).run(() => useDependency())).toThrow(
      'Provider was redefine after creation instance',
    )
  })
})
