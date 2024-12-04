import { describe, it, beforeEach, afterEach, expect, vi, MockInstance } from 'vitest'
import { effectScope } from 'vue'
import { provider, getContainer, isProvider } from '../src'
import { DescriptorsContainer } from '../src/plugin/descriptors-container'
import { DependencyFactory } from '../src/types'

vi.mock('../src/get-container')

describe('provider function', () => {
  it('returns provider as function with __isProvider__ flag', () => {
    const dependencyFactory = () => 'test'
    const useDependency = provider(dependencyFactory)

    expect(useDependency).toBeInstanceOf(Function)
    expect(isProvider(useDependency)).toBe(true)
  })
})

describe('Provider function', () => {
  let container: DescriptorsContainer 
  let addToContainerSpy: MockInstance
  let getFromContainerSpy: MockInstance
  let deleteFromContainerSpy: MockInstance
  let originalInstance: { test: string }
  let dependencyFactory: DependencyFactory<{ test: string }>
  let useDependency: ReturnType<typeof provider<{ test: string }>>
  let providerKey: symbol
  
  beforeEach(() => {
    originalInstance = { test: 'test' }
    dependencyFactory = () => originalInstance
    useDependency = provider(dependencyFactory)
    providerKey = useDependency.asKey

    container = new DescriptorsContainer()
    vi.mocked(getContainer).mockReturnValue(container)
    addToContainerSpy = vi.spyOn(container, 'add')
    getFromContainerSpy = vi.spyOn(container, 'get')
    deleteFromContainerSpy = vi.spyOn(container, 'delete')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers factory in container at the time of the first call and only once', () => {
    const scope1 = effectScope(true)
    const scope2 = effectScope(true)
    scope1.run(() => useDependency())
    scope2.run(() => useDependency())

    expect(addToContainerSpy).toHaveBeenNthCalledWith(1, providerKey, dependencyFactory)
    expect(getFromContainerSpy).toHaveBeenNthCalledWith(2, providerKey)
    expect(container.size).toBe(1)
  })

  it('returns the same instance on each call', () => {
    const scope1 = effectScope(true)
    const scope2 = effectScope(true)
    const result1 = scope1.run(() => useDependency())
    const result2 = scope2.run(() => useDependency())

    expect(result1).toBe(originalInstance)
    expect(result2).toBe(originalInstance)
    expect(result1).toBe(result2)
  })

  it('deletes factory from container when last scope is stopped', () => {
    const scope1 = effectScope(true)
    const scope2 = effectScope(true)
    scope1.run(() => useDependency())
    scope2.run(() => useDependency())

    scope1.stop()
    expect(container.size).toBe(1)
    expect(deleteFromContainerSpy).not.toHaveBeenCalled()

    scope2.stop()
    expect(deleteFromContainerSpy).toHaveBeenCalledWith(providerKey)
    expect(container.size).toBe(0)
  })

  it('uses unique symbol key for each provider', () => {
    const anotherDependencyFactory = () => ({ test: 'another' })
    const anotherUseDependency = provider(anotherDependencyFactory)

    expect(useDependency.asKey).not.toBe(anotherUseDependency.asKey)
  })

  it('should not have instance available by providerKey before first provider call', () => {
    // Before first call
    const descriptorBeforeCall = container.get(providerKey)
    expect(descriptorBeforeCall).toBeUndefined()

    // After first call
    const scope = effectScope(true)
    scope.run(() => useDependency())
    
    const descriptorAfterCall = container.get(providerKey)
    expect(descriptorAfterCall).toBeDefined()
    expect(descriptorAfterCall?.instance).toBe(originalInstance)
  })

  describe('with persistentInstance option', () => {
    let usePersistentDependency: ReturnType<typeof provider<{ test: string }>>
    
    beforeEach(() => {
      usePersistentDependency = provider(dependencyFactory, { persistentInstance: true })
      providerKey = usePersistentDependency.asKey
    })

    it('should not delete instance from container when scopes are stopped', () => {
      const scope1 = effectScope(true)
      const scope2 = effectScope(true)
      
      const instance1 = scope1.run(() => usePersistentDependency())
      scope1.stop()

      const instance2 = scope2.run(() => usePersistentDependency())
      scope2.stop()
      
      expect(deleteFromContainerSpy).not.toHaveBeenCalled()
      expect(container.size).toBe(1)
      
      const descriptor = container.get(usePersistentDependency.asKey)
      expect(descriptor?.instance).toBe(originalInstance)
      expect(instance1).toBe(originalInstance)
      expect(instance2).toBe(originalInstance)
    })

    
    it('should handle nested non-persistent provider inside persistent provider factory and make it persistent', () => {
      const nestedInstance = { test: 'nested' }
      const nestedFactory = vi.fn(() => nestedInstance)
      const useNestedDependency = provider(nestedFactory)
      
      interface PersistentType {
        nested: { test: string }
        test: string
      }
      
      const persistentFactory = vi.fn(() => {
        const nested = useNestedDependency()
        return { nested, test: 'persistent' }
      })
      const usePersistentWithNested = provider<PersistentType>(persistentFactory, { persistentInstance: true })

      // First scope
      const scope1 = effectScope(true)
      const result1 = scope1.run(() => usePersistentWithNested())
      expect(result1?.nested).toBe(nestedInstance)
      
      scope1.stop()
      // After first scope stops, nested provider should be removed but persistent remains
      expect(container.get(useNestedDependency.asKey)).toBeDefined()
      expect(container.get(usePersistentWithNested.asKey)).toBeDefined()

      // Second scope
      const scope2 = effectScope(true)
      const result2 = scope2.run(() => usePersistentWithNested())
      
      // Persistent provider returns same outer instance
      expect(result2).toBe(result1)
      expect(result2?.nested).toBe(nestedInstance)
      expect(nestedFactory).toHaveBeenCalledTimes(1)
      
      scope2.stop()
      // After second scope stops
      expect(container.get(useNestedDependency.asKey)).toBeDefined()
      expect(container.get(usePersistentWithNested.asKey)).toBeDefined()
    })
  })
})
