import { describe, it, vi } from 'vitest'
import { getCurrentInstance } from 'vue'
import { DescriptorsContainer } from '../src/plugin/descriptors-container'
import { getContainer } from '../src/get-container'

vi.mock('vue')

describe('getContainer function', () => {
  it('returns container from current VueComponent instance if it exists', () => {
    const container = new DescriptorsContainer()
    vi.mocked(getCurrentInstance).mockReturnValue({ proxy: { $vueModelerDc: container } })
    
    expect(getContainer()).toBe(container)
  })

  it('throws error if $vueModelerDc is undefined', () => {
    vi.mocked(getCurrentInstance).mockReturnValue({ proxy: { $vueModelerDc: undefined } })
    
    expect(() => getContainer()).toThrow('Dependency container undefined. Check plugin setup')  
  })

  it('throws error if getCurrentInstance is undefined', () => {
    vi.mocked(getCurrentInstance).mockReturnValue(null)
    
    expect(() => getContainer()).toThrow('Current instance is undefined')  
  })
})
