import { describe, it, beforeEach, afterEach, expect, vi, MockInstance } from 'vitest'
import { effectScope } from 'vue'
import { defineProvider, getContainer } from '../src'
import { DescriptorsContainer } from '../src/plugin/descriptors-container'
// import * as vueModule from 'vue'

vi.mock('../src/get-container')
// vi.mock('vue', 
//   async () => {
//     const actual = await vi.importActual<typeof import('vue')>('vue')
//     return {  
//       ...actual,
//     }
//   }
// )

describe('defineProvider function', () => {
  it('returns provider as function', () => {
    const dependencyFactory = () => 'test'
    const provider = defineProvider(dependencyFactory)

    expect(provider).toBeInstanceOf(Function)
  })
})

describe('Provider function', () => {
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
    provider = defineProvider(dependencyFactory)

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

  it('deletes factory from container by the last scope stop', () => {
    const scope1 = effectScope(true)
    const scope2 = effectScope(true)
    scope1.run(() => provider())
    scope2.run(() => provider())

    
    scope1.stop()
    expect(container.size).toBe(1)
    expect(deleteFromContainerSpy).not.toHaveBeenCalled()

    scope2.stop()
    expect(deleteFromContainerSpy).toHaveBeenCalledTimes(1)
    expect(container.size).toBe(0)
  })
})
