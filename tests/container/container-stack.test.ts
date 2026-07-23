import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentInstance } from 'vue'

import { Container } from '../../src/container/container'
import {
  getContainer,
  getContainerFromCurrentVueApp,
  popContainer,
  pushContainer,
} from '../../src/container/container-stack'

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    getCurrentInstance: vi.fn(),
  }
})

function clearContainerStack (): void {
  for (;;) {
    try {
      popContainer()
    } catch {
      return
    }
  }
}

describe('container stack', () => {
  beforeEach(() => {
    clearContainerStack()
    vi.mocked(getCurrentInstance).mockReset()
    vi.mocked(getCurrentInstance).mockReturnValue(null)
  })

  afterEach(() => {
    clearContainerStack()
  })

  it('returns container from current instance proxy when available', () => {
    const container = new Container()
    vi.mocked(getCurrentInstance).mockReturnValue(
      { proxy: { $vueModelerDc: container } } as unknown as ReturnType<typeof getCurrentInstance>,
    )

    expect(getContainerFromCurrentVueApp()).toBe(container)
  })

  it('throws when called outside Vue component context', () => {
    vi.mocked(getCurrentInstance).mockReturnValue(null)

    expect(() => getContainerFromCurrentVueApp()).toThrow(
      'Provider hook called outside Vue component context. Use dc.resolve(provider) instead.',
    )
  })

  it('throws when plugin container is missing on current instance', () => {
    vi.mocked(getCurrentInstance).mockReturnValue(
      { proxy: {} } as unknown as ReturnType<typeof getCurrentInstance>,
    )

    expect(() => getContainerFromCurrentVueApp()).toThrow(
      'Vue Modeler DC plugin not installed',
    )
  })

  it('prefers the active stack container over inject fallback', () => {
    const stackedContainer = new Container()

    pushContainer(stackedContainer)

    expect(getContainer()).toBe(stackedContainer)
  })

  it('does not push the same container twice in a row', () => {
    const container = new Container()

    pushContainer(container)
    pushContainer(container)
    popContainer()

    expect(() => getContainer()).toThrow(
      'Provider hook called outside Vue component context. Use dc.resolve(provider) instead.',
    )
  })

  it('throws when popping an empty stack', () => {
    expect(() => {
      popContainer()
    }).toThrow('Container stack is empty')
  })
})
