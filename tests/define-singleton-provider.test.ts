import { describe, expect, it, MockInstance, vi } from 'vitest'
import { effectScope } from 'vue'
import { getContainer } from '../src/get-container'
import { DescriptorsContainer } from '../src/plugin/descriptors-container'
import { defineSingletonProvider } from '../src/define-singleton-provider'

vi.mock('../src/get-container')

describe('defineSingletonProvider', () => {
  it('returns provider as function', () => {
    const dependencyFactory = () => 'test'
    const provider = defineSingletonProvider(dependencyFactory)

    expect(provider).toBeInstanceOf(Function)
  })
})

describe('SingletonProvider function', () => {
  let container: DescriptorsContainer 
  let addToContainerSpy: MockInstance
  let getFromContainerSpy: MockInstance
  let deleteFromContainerSpy: MockInstance
  let originalInstance: { test: string }
  let dependencyFactory: () => { test: string }
  let provider: () => { test: string }
  
  beforeEach(() => {
    originalInstance = { test: 'test' }
    dependencyFactory = () => originalInstance
    provider = defineSingletonProvider(dependencyFactory)

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
    scope1.run(() => provider())
    scope2.run(() => provider())

    expect(addToContainerSpy).toHaveBeenNthCalledWith(1, dependencyFactory)
    expect(getFromContainerSpy).toHaveBeenNthCalledWith(2, dependencyFactory)
    expect(container.size).toBe(1)
  })

  it('returns the same instance on each call', () => {
    const scope1 = effectScope(true)
    const scope2 = effectScope(true)
    const result1 = scope1.run(() => provider())
    const result2 = scope2.run(() => provider())

    expect(result1).toBe(originalInstance)
    expect(result2).toBe(originalInstance)
    expect(result1).toBe(result2)
  })

  it('does not delete factory from container by the last scope stop', () => {
    const scope = effectScope(true)
    const result = scope.run(() => provider())
    
    expect(container.size).toBe(1)
    scope.stop()
    expect(container.size).toBe(1)
    expect(deleteFromContainerSpy).not.toHaveBeenCalled()
    expect(result).toBe(originalInstance)
  })
})
