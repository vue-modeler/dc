import { describe, expect, it, vi } from 'vitest'

import { Container } from '../../src/container/container'
import { provider } from '../../src/provider/provider'
import { createScope } from '../../src/scope/create-scope'
import type { DependencyContainer } from '../../src/types'
import type { Vue as VueInstance } from 'vue/types/vue'

describe('Container', () => {
  it('binds and exposes vueApp instance', () => {
    const container = new Container()

    expect(container.vueApp).toBeUndefined()

    const app = {} as unknown as VueInstance
    container.bindVueApp(app)
    expect(container.vueApp).toBe(app)
  })

  it('registers descriptors and exposes them by provider or symbol', () => {
    const container = new Container()
    const factory = vi.fn(() => ({ id: 'registered' }))
    const useDependency = provider(() => ({ id: 'provider' }))

    const descriptor = container.register(useDependency, factory)

    expect(factory).toHaveBeenCalledWith({ dc: container })
    expect(container.get(useDependency)).toBe(descriptor)
    expect(container.get(useDependency.asKey)).toBe(descriptor)
    expect(container.size).toBe(1)
  })

  it('registers descriptors directly by symbol key but resolve requires a provider-owned key', () => {
    const container = new Container()
    const key = Symbol('registered')
    const factory = vi.fn(() => ({ id: 'registered' }))

    const descriptor = container.register(key, factory)

    expect(factory).toHaveBeenCalledWith({ dc: container })
    expect(container.get(key)).toBe(descriptor)
    expect(container.size).toBe(1)
    expect(() => container.resolve(key)).toThrow(
      'Dependency descriptor not found for symbol key',
    )
  })

  it('reuses the existing descriptor when factory reference is unchanged', () => {
    const container = new Container()
    const factory = vi.fn(() => ({ id: 'shared' }))
    const key = Symbol('shared')

    const first = container.register(key, factory)
    const second = container.register(key, factory)

    expect(first).toBe(second)
    expect(container.size).toBe(1)
  })

  it('replaces the descriptor when factory reference changes', () => {
    const container = new Container()
    const key = Symbol('shared')
    const first = container.register(key, () => ({ id: 'first' }))
    const disposeSpy = vi.spyOn(first, 'disposeForReplace')

    const second = container.register(key, () => ({ id: 'second' }))

    expect(second).not.toBe(first)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(container.get(key)).toBe(second)
  })

  it('deletes descriptors by provider or symbol key', () => {
    const container = new Container()
    const useDependency = provider(() => ({ id: 'value' }))

    container.register(useDependency, () => ({ id: 'value' }))
    expect(container.delete(useDependency)).toBe(true)
    expect(container.get(useDependency)).toBeUndefined()

    container.register(useDependency, () => ({ id: 'value' }))
    expect(container.delete(useDependency.asKey)).toBe(true)
    expect(container.size).toBe(0)
  })

  it('returns false when deleting an unknown descriptor', () => {
    const container = new Container()

    expect(container.delete(Symbol('missing'))).toBe(false)
  })

  it('resolves nested providers from the same active container', () => {
    const container = new Container()
    const useChild = provider<{ container: DependencyContainer }>(({ dc }) => ({ container: dc }))
    const useParent = provider<{
      container: DependencyContainer
      child: { container: DependencyContainer }
    }>(({ dc }) => ({
      container: dc,
      child: useChild(),
    }))

    const result = container.resolve(useParent)

    expect(result.container).toBe(container)
    expect(result.child.container).toBe(container)
    expect(container.size).toBe(2)
  })

  it('resolves an existing instance by provider.asKey through the provider', () => {
    const container = new Container()
    const useDependency = provider(() => ({ id: 'by-as-key' }))

    const first = container.resolve(useDependency)
    const second = container.resolve(useDependency.asKey)

    expect(second).toBe(first)
    expect(container.size).toBe(1)
  })

  it('throws when resolving an unknown symbol key', () => {
    const container = new Container()

    expect(() => container.resolve(Symbol('missing'))).toThrow(
      'Dependency descriptor not found for symbol key',
    )
  })

  it('resolves descriptors by an alias key assigned on the provider', () => {
    const container = new Container()
    const aliasKey = Symbol('alias')
    const useDependency = provider(() => ({ id: 'alias-target' }))

    useDependency.assignKey(aliasKey)

    const viaProvider = container.resolve(useDependency)
    const viaAlias = container.resolve<{ id: string }>(aliasKey)

    expect(viaAlias).toBe(viaProvider)
    expect(container.get(aliasKey)).toBe(container.get(useDependency))
  })

  it('binds resolve to a custom scope and removes the descriptor when the scope stops', () => {
    const container = new Container()
    const instance = { id: 'scoped', destructor: vi.fn() }
    const useDependency = provider(() => instance)
    const deleteSpy = vi.spyOn(container, 'delete')
    const scope = createScope()

    const result = container.resolve(useDependency, scope)

    expect(result).toBe(instance)
    expect(container.size).toBe(1)

    scope.stop()

    expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
    expect(container.size).toBe(0)
    expect(instance.destructor).toHaveBeenCalledTimes(1)
  })

  it('wires disposal for an already-existing descriptor when resolve is called with a scope', () => {
    const container = new Container()
    const useDependency = provider(() => ({ id: 'late-bind' }))
    const deleteSpy = vi.spyOn(container, 'delete')

    // create without scope (no cleanup wiring)
    expect(container.resolve(useDependency)).toEqual({ id: 'late-bind' })
    expect(container.size).toBe(1)

    const scope = createScope()
    container.resolve(useDependency, scope)
    expect(container.size).toBe(1)

    scope.stop()

    expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
    expect(container.size).toBe(0)
  })

  it('keeps a shared instance until the last custom scope stops', () => {
    const container = new Container()
    const useDependency = provider(() => ({ id: 'shared-scopes' }))
    const deleteSpy = vi.spyOn(container, 'delete')
    const scopeA = createScope()
    const scopeB = createScope()

    container.resolve(useDependency, scopeA)
    container.resolve(useDependency, scopeB)

    scopeA.stop()
    expect(container.size).toBe(1)
    expect(deleteSpy).not.toHaveBeenCalled()

    scopeB.stop()
    expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
    expect(container.size).toBe(0)
  })

  it('does not dispose a persistent instance when the custom scope stops', () => {
    const container = new Container()
    const useDependency = provider(() => ({ id: 'persistent' }), {
      persistentInstance: true,
    })
    const deleteSpy = vi.spyOn(container, 'delete')
    const scope = createScope()

    const result = container.resolve(useDependency, scope)
    scope.stop()

    expect(result).toEqual({ id: 'persistent' })
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(container.get(useDependency)?.instance).toEqual({ id: 'persistent' })
  })
})
