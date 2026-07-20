import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, getCurrentInstance } from 'vue'
import type { VueApp } from '../../src/vue-app'

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

  it('returns the root Vue app when the container is bound', () => {
    const app = {} as unknown as VueApp
    container.bindVueApp(app)

    const result = effectScope(true).run(() => useVueApp())

    expect(result).toBe(app)
  })

  it('throws when the root Vue app is not bound yet', () => {
    expect(() => effectScope(true).run(() => useVueApp())).toThrow(
      'useVueApp: root Vue app is not bound to the container (expected app.use(vueModelerDc) to run)',
    )
  })
})
