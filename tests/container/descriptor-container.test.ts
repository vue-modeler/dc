import { describe, expect, it, vi } from 'vitest'

import { DescriptorContainer } from '../../src/container/descriptor-container'
import { provider } from '../../src/provider/provider'
import type { DependencyContainer } from '../../src/types'

describe('DescriptorContainer', () => {
  it('registers descriptors and exposes them by provider or symbol', () => {
    const container = new DescriptorContainer()
    const factory = vi.fn(() => ({ id: 'registered' }))
    const useDependency = provider(() => ({ id: 'provider' }))

    const descriptor = container.register(useDependency, factory)

    expect(factory).toHaveBeenCalledWith({ dc: container })
    expect(container.get(useDependency)).toBe(descriptor)
    expect(container.get(useDependency.asKey)).toBe(descriptor)
    expect(container.size).toBe(1)
  })

  it('registers descriptors directly by symbol key', () => {
    const container = new DescriptorContainer()
    const key = Symbol('registered')
    const factory = vi.fn(() => ({ id: 'registered' }))

    const descriptor = container.register(key, factory)

    expect(factory).toHaveBeenCalledWith({ dc: container })
    expect(container.get(key)).toBe(descriptor)
    expect(container.resolve<typeof descriptor.instance>(key)).toBe(descriptor.instance)
    expect(container.size).toBe(1)
  })

  it('reuses the existing descriptor when factory reference is unchanged', () => {
    const container = new DescriptorContainer()
    const factory = vi.fn(() => ({ id: 'shared' }))
    const key = Symbol('shared')

    const first = container.register(key, factory)
    const second = container.register(key, factory)

    expect(first).toBe(second)
    expect(container.size).toBe(1)
  })

  it('replaces the descriptor when factory reference changes', () => {
    const container = new DescriptorContainer()
    const key = Symbol('shared')
    const first = container.register(key, () => ({ id: 'first' }))
    const disposeSpy = vi.spyOn(first, 'disposeForReplace')

    const second = container.register(key, () => ({ id: 'second' }))

    expect(second).not.toBe(first)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(container.get(key)).toBe(second)
  })

  it('deletes descriptors by provider or symbol key', () => {
    const container = new DescriptorContainer()
    const useDependency = provider(() => ({ id: 'value' }))

    container.register(useDependency, () => ({ id: 'value' }))
    expect(container.delete(useDependency)).toBe(true)
    expect(container.get(useDependency)).toBeUndefined()

    container.register(useDependency, () => ({ id: 'value' }))
    expect(container.delete(useDependency.asKey)).toBe(true)
    expect(container.size).toBe(0)
  })

  it('returns false when deleting an unknown descriptor', () => {
    const container = new DescriptorContainer()

    expect(container.delete(Symbol('missing'))).toBe(false)
  })

  it('resolves nested providers from the same active container', () => {
    const container = new DescriptorContainer()
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

  it('throws when resolving an unknown symbol key', () => {
    const container = new DescriptorContainer()

    expect(() => container.resolve(Symbol('missing'))).toThrow(
      'Dependency descriptor not found for symbol key',
    )
  })
})
