import { describe, expect, it, vi } from 'vitest'
import { inject } from 'vue'
import { DescriptorsContainer } from '../src/plugin/descriptors-container'
import { getContainer } from '../src/get-container'

vi.mock('vue')
vi.mock('../src/plugin/vue-modeler-dc')

describe('getContainer function', () => {
  it('returns container from inject if available', () => {
    const container = new DescriptorsContainer()
    vi.mocked(inject).mockReturnValue(container)

    expect(getContainer()).toBe(container)
  })

  it('returns global container when inject returns null', () => {
    vi.mocked(inject).mockReturnValue(null)

    expect(() => getContainer()).toThrow('Vue Modeler DC plugin not installed')
  })

  it('throws error when inject returns null', () => {
    vi.mocked(inject).mockReturnValue(null)

    expect(() => getContainer()).toThrow('Vue Modeler DC plugin not installed')
  })
})
