import { describe, it, expect, vi, beforeEach } from 'vitest'
import { vueModelerDc } from '../../src/plugin/vue-modeler-dc'

// Mock DescriptorsContainer
vi.mock('../../src/plugin/descriptors-container', () => ({
  DescriptorsContainer: vi.fn().mockImplementation(function() {
    return Object.create(DescriptorsContainer.prototype) as DescriptorsContainer
  })
}))

// Import the mocked DescriptorsContainer
import { DescriptorsContainer } from '../../src/plugin/descriptors-container'
import { getContainer } from '../../src/get-container'

describe('vueModelerDc', () => {
  beforeEach(() => {
    vi.clearAllMocks() // Clear all mocks before each test
  })

  it('should export vueModelerDc plugin', () => {
    expect(vueModelerDc).toBeDefined()
    expect(typeof vueModelerDc.install).toBe('function')
  })

  it('should throw error when getContainer called without plugin installation', () => {
    expect(() => getContainer()).toThrow('Vue Modeler DC plugin not installed')
  })
})
