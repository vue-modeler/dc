import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, getCurrentInstance } from 'vue'
import type { Vue as VueInstance } from 'vue/types/vue'

import { Container } from '../../src/container/container'
import { useVueApp } from '../../src/hooks/use-vue-app/use-vue-app'

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    getCurrentInstance: vi.fn(),
  }
})

describe('useVueApp', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
    vi.mocked(getCurrentInstance).mockReset()
    vi.mocked(getCurrentInstance).mockReturnValue(
      { proxy: { $vueModelerDc: container } } as unknown as ReturnType<typeof getCurrentInstance>,
    )
  })

  it('returns the root Vue instance when the container is bound', () => {
    const app = {} as unknown as VueInstance
    container.bindVueApp(app)

    const result = effectScope(true).run(() => useVueApp())

    expect(result).toBe(app)
  })

  it('throws when the root Vue instance is not bound yet', () => {
    expect(() => effectScope(true).run(() => useVueApp())).toThrow(
      'useVueApp: root Vue instance is not bound to the container (expected vueModelerDc beforeCreate mixin to run)',
    )
  })
})
