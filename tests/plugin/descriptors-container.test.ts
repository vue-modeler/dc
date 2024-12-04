import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DescriptorsContainer } from '../../src/plugin/descriptors-container'

// Mock the Descriptor module
vi.mock('../../src/plugin/descriptor', () => ({
  Descriptor: vi.fn().mockImplementation((factory: () => object) => ({
    factory,
  }))
}))

// Import the mocked Descriptor after vi.mock
import { Descriptor } from '../../src/plugin/descriptor'

describe('DescriptorsContainer', () => {
  let container: DescriptorsContainer

  beforeEach(() => {
    container = new DescriptorsContainer()
    vi.mocked(Descriptor).mockClear()
  })

  it('should add and get a descriptor', () => {
    const factory = vi.fn()
    const key = Symbol('test')
    const descriptor = container.add(key, factory)
    expect(Descriptor).toHaveBeenCalledWith(factory)
    expect(descriptor).toEqual({ factory })
    expect(container.get(key)).toBe(descriptor)
  })

  it('should return the same descriptor when adding the same key twice', () => {
    const factory1 = vi.fn()
    const factory2 = vi.fn()
    const key = Symbol('test')
    
    const descriptor1 = container.add(key, factory1)
    const descriptor2 = container.add(key, factory2)
    
    expect(descriptor1).toBe(descriptor2)
    expect(Descriptor).toHaveBeenCalledTimes(1)
    expect(Descriptor).toHaveBeenCalledWith(factory1)
  })

  it('should delete a descriptor', () => {
    const key = Symbol('test')
    container.add(key, vi.fn())
    expect(container.delete(key)).toBe(true)
    expect(container.get(key)).toBeUndefined()
  })

  it('should return false when deleting non-existent descriptor', () => {
    const key = Symbol('test')
    expect(container.delete(key)).toBe(false)
  })

  it('should return the correct size', () => {
    expect(container.size).toBe(0)
    
    const key1 = Symbol('test1')
    const key2 = Symbol('test2')
    
    container.add(key1, vi.fn())
    expect(container.size).toBe(1)
    
    container.add(key2, vi.fn())
    expect(container.size).toBe(2)
    
    // Adding with same key shouldn't increase size
    container.add(key1, vi.fn())
    expect(container.size).toBe(2)
  })

  it('should return undefined for non-existent descriptor', () => {
    const key = Symbol('nonexistent')
    expect(container.get(key)).toBeUndefined()
  })

  it('should correctly get an existing descriptor', () => {
    const factory = vi.fn()
    const key = Symbol('test')
    
    const addedDescriptor = container.add(key, factory)
    const retrievedDescriptor = container.get(key)
    
    expect(retrievedDescriptor).toBe(addedDescriptor)
    expect(Descriptor).toHaveBeenCalledTimes(1)
  })
})
