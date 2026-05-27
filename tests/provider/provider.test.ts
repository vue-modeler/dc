import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, getCurrentInstance, getCurrentScope, inject, onScopeDispose } from 'vue'

import { provider } from '../../src/provider/provider'
import { isProvider } from '../../src/provider/is-provider'
import { Container } from '../../src/container/container'
import type { DepFactory, DependencyContainer } from '../../src/types'

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    getCurrentInstance: vi.fn(),
    getCurrentScope: vi.fn(actual.getCurrentScope),
    inject: vi.fn(),
    onScopeDispose: vi.fn(actual.onScopeDispose),
  }
})

describe('provider', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
    vi.mocked(getCurrentInstance).mockReset()
    vi.mocked(getCurrentInstance).mockReturnValue(
      { proxy: { $vueModelerDc: container } } as unknown as ReturnType<typeof getCurrentInstance>,
    )
    vi.mocked(getCurrentScope).mockImplementation((async () => {
      const actual = await vi.importActual<typeof import('vue')>('vue')
      return actual.getCurrentScope()
    }) as unknown as typeof getCurrentScope)
    vi.mocked(inject).mockReset()
    vi.mocked(onScopeDispose).mockClear()
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

  it('returns the instance immediately when called without an active Vue scope', () => {
    const instance = { id: 'no-scope' }
    const useDependency = provider(() => instance)
    const deleteSpy = vi.spyOn(container, 'delete')

    vi.mocked(getCurrentScope).mockReturnValue(undefined)

    expect(useDependency()).toBe(instance)
    expect(onScopeDispose).not.toHaveBeenCalled()
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(container.size).toBe(1)
  })

  it('returns the instance immediately in SSR context (window is undefined) even inside effect scope', async () => {
    const instance = { id: 'ssr' }
    const globalWithWindow = globalThis as unknown as { window?: unknown }
    const originalWindow = globalWithWindow.window
    globalWithWindow.window = undefined

    try {
      // `provider.ts` captures `isServerSide` at module init time, so we need a fresh import.
      vi.resetModules()
      const { provider: providerSsr } = await import('../../src/provider/provider')

      const useDependency = providerSsr(() => instance)
      const deleteSpy = vi.spyOn(container, 'delete')

      const scope = effectScope(true)
      const result = scope.run(() => useDependency())

      expect(result).toBe(instance)

      scope.stop()
      expect(onScopeDispose).not.toHaveBeenCalled()
      expect(deleteSpy).not.toHaveBeenCalled()
      expect(container.size).toBe(1)
    } finally {
      globalWithWindow.window = originalWindow
    }
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

  it('throws a readable error on self-referential provider factory (cycle)', () => {
    const holder: { fn: () => unknown } = { fn: () => undefined as unknown }
    const useSelf = provider(() => holder.fn())
    holder.fn = () => useSelf()

    expect(() => effectScope(true).run(() => useSelf())).toThrow(
      'Cyclic dependency detected while creating provider instance',
    )
  })

  it('throws a readable error on mutually-referential providers (A <-> B cycle)', () => {
    const holder: { useA: () => unknown; useB: () => unknown } = {
      useA: () => undefined as unknown,
      useB: () => undefined as unknown,
    }

    const useA = provider(() => holder.useB())
    const useB = provider(() => holder.useA())
    holder.useA = () => useA()
    holder.useB = () => useB()

    expect(() => effectScope(true).run(() => useA())).toThrow(
      'Cyclic dependency detected while creating provider instance',
    )
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
