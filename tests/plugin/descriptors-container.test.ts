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
    const descriptor = container.add(factory)
    expect(Descriptor).toHaveBeenCalledWith(factory)
    expect(descriptor).toEqual({ factory })
    expect(container.get(factory)).toBe(descriptor)
  })

  it('should return the same descriptor when adding the same factory twice', () => {
    const factory = vi.fn()
    const descriptor1 = container.add(factory)
    const descriptor2 = container.add(factory)
    expect(descriptor1).toBe(descriptor2)
    expect(Descriptor).toHaveBeenCalledTimes(1)
  })

  it('should delete a descriptor', () => {
    const factory = vi.fn()
    container.add(factory)
    expect(container.delete(factory)).toBe(true)
    expect(container.get(factory)).toBeUndefined()
  })

  it('should return the correct size', () => {
    expect(container.size).toBe(0)
    container.add(vi.fn())
    expect(container.size).toBe(1)
    container.add(vi.fn())
    expect(container.size).toBe(2)
  })

  it('should return undefined for non-existent descriptor', () => {
    const nonExistentFactory = vi.fn()
    expect(container.get(nonExistentFactory)).toBeUndefined()
  })

  it('should correctly get an existing descriptor', () => {
    const factory = vi.fn()
    const addedDescriptor = container.add(factory)
    const retrievedDescriptor = container.get(factory)
    expect(retrievedDescriptor).toBe(addedDescriptor)
    expect(Descriptor).toHaveBeenCalledTimes(1)
  })
})
