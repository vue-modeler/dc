import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inject } from 'vue'

import { DescriptorContainer } from '../../src/container/descriptor-container'
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
    inject: vi.fn(),
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
    vi.mocked(inject).mockReset()
  })

  afterEach(() => {
    clearContainerStack()
  })

  it('returns injected container from the current Vue app', () => {
    const container = new DescriptorContainer()
    vi.mocked(inject).mockReturnValue(container)

    expect(getContainerFromCurrentVueApp()).toBe(container)
  })

  it('throws when plugin container is missing', () => {
    vi.mocked(inject).mockReturnValue(undefined)

    expect(() => getContainerFromCurrentVueApp()).toThrow(
      'Vue Modeler DC plugin not installed',
    )
  })

  it('prefers the active stack container over inject fallback', () => {
    const injectedContainer = new DescriptorContainer()
    const stackedContainer = new DescriptorContainer()
    vi.mocked(inject).mockReturnValue(injectedContainer)

    pushContainer(stackedContainer)

    expect(getContainer()).toBe(stackedContainer)
  })

  it('does not push the same container twice in a row', () => {
    const injectedContainer = new DescriptorContainer()
    const container = new DescriptorContainer()
    vi.mocked(inject).mockReturnValue(injectedContainer)

    pushContainer(container)
    pushContainer(container)
    popContainer()

    expect(getContainer()).toBe(injectedContainer)
  })

  it('throws when popping an empty stack', () => {
    expect(() => {
      popContainer()
    }).toThrow('Container stack is empty')
  })
})
