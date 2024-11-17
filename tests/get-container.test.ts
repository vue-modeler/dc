import { describe, expect, it, vi } from 'vitest'
import { getCurrentInstance } from 'vue'
import { DescriptorsContainer } from '../src/plugin/descriptors-container'
import { getContainer } from '../src/get-container'
import '../src/vue.d.ts'

vi.mock('vue')

describe('getContainer function', () => {
  it('returns container from current VueComponent instance if it exists', () => {
    const container = new DescriptorsContainer()
    vi.mocked(getCurrentInstance).mockReturnValue({ proxy: { $vueModelerDc: container } } as ReturnType<typeof getCurrentInstance>)

    expect(getContainer()).toBe(container)
  })

  it('throws error if $vueModelerDc is undefined', () => {
    vi.mocked(getCurrentInstance).mockReturnValue({ proxy: { $vueModelerDc: undefined } } as ReturnType<typeof getCurrentInstance>)
    
    expect(() => getContainer()).toThrow('Dependency container undefined. Check plugin setup')  
  })

  it('throws error if getCurrentInstance is undefined', () => {
    vi.mocked(getCurrentInstance).mockReturnValue(null)
    
    expect(() => getContainer()).toThrow('Current instance is undefined')  
  })
})
