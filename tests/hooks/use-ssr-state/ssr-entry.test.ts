import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { VueApp } from '../../../src/vue-app'

import * as containerStack from '../../../src/container/container-stack'
import { useSsrState } from '../../../src/hooks/use-ssr-state/use-ssr-state'
import { SsrStateService } from '../../../src/hooks/use-ssr-state/ssr-state-service'
import { vueModelerDc } from '../../../src/plugin/vue-modeler-dc'
import type { DependencyContainerInternal } from '../../../src/types'

import '../../../src/vue.d.ts'

function createMountedApp (rootComponent = defineComponent({ render: () => h('div') })): {
  app: VueApp
  el: HTMLDivElement
} {
  const app = createApp(rootComponent)
  app.use(vueModelerDc)
  const el = document.createElement('div')
  app.mount(el)
  return { app, el }
}

describe('useSsrState SSR entry', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('resolves useSsrState in SSR entry outside Vue component context', () => {
    const { app } = createMountedApp()

    const ssrStateService = app.config.globalProperties.$vueModelerDc.resolve(useSsrState)

    expect(ssrStateService).toBeInstanceOf(SsrStateService)
    expect(app.config.globalProperties.$vueModelerDc.resolve(useSsrState)).toBe(ssrStateService)

    app.unmount()
  })

  it('resolves via container stack without Vue instance fallback', () => {
    const getContainerFromCurrentVueAppSpy = vi.spyOn(
      containerStack,
      'getContainerFromCurrentVueApp',
    ).mockImplementation(() => {
      throw new Error('getContainerFromCurrentVueApp should not be called')
    })

    const { app } = createMountedApp()

    expect(() => app.config.globalProperties.$vueModelerDc.resolve(useSsrState)).not.toThrow()
    expect(app.config.globalProperties.$vueModelerDc.resolve(useSsrState)).toBeInstanceOf(SsrStateService)
    expect(getContainerFromCurrentVueAppSpy).not.toHaveBeenCalled()

    getContainerFromCurrentVueAppSpy.mockRestore()
    app.unmount()
  })

  it('throws when useSsrState is called directly outside Vue component context', () => {
    expect(() => useSsrState()).toThrow(
      'Provider hook called outside Vue component context. Use dc.resolve(provider) instead.',
    )
  })

  it('fails on resolve when pushContainer and getContainer use separate module stacks', () => {
    // Simulate a real-world SSR bundling issue: the same package can be included twice
    // (e.g. CJS + ESM, or duplicated dependency graph). Each copy has its own module-level
    // singleton `containerStack`. If `pushContainer` writes to stack A, but `getContainer`
    // reads from stack B, then `provider()` will fall back to Vue context and throw.
    const moduleCopyA_stack: DependencyContainerInternal[] = []
    const moduleCopyB_stack: DependencyContainerInternal[] = []

    const pushContainerSpy = vi.spyOn(containerStack, 'pushContainer').mockImplementation((container) => {
      moduleCopyA_stack.push(container)
    })
    const popContainerSpy = vi.spyOn(containerStack, 'popContainer').mockImplementation(() => {
      moduleCopyA_stack.pop()
    })
    const getContainerSpy = vi.spyOn(containerStack, 'getContainer').mockImplementation(() => {
      const fromModuleCopyB = moduleCopyB_stack.at(-1)

      if (fromModuleCopyB) {
        return fromModuleCopyB
      }

      return containerStack.getContainerFromCurrentVueApp()
    })

    const { app } = createMountedApp()

    expect(moduleCopyB_stack).toHaveLength(0)

    expect(() => app.config.globalProperties.$vueModelerDc.resolve(useSsrState)).toThrow(
      'Provider hook called outside Vue component context. Use dc.resolve(provider) instead.',
    )
    expect(moduleCopyA_stack).toHaveLength(0)

    pushContainerSpy.mockRestore()
    popContainerSpy.mockRestore()
    getContainerSpy.mockRestore()
    app.unmount()
  })

  it('allows SSR entry to inject state registered during component render', async () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(
      undefined as unknown as Window & typeof globalThis,
    )

    try {
      const TestComponent = defineComponent({
        setup (): Record<string, never> {
          const ssrState = useSsrState()

          ssrState.addSerializer(() => ({
            extractionKey: 'model',
            value: { id: 1 },
          }))

          return {}
        },
        render: () => h('div'),
      })

      const app = createSSRApp(TestComponent)
      app.use(vueModelerDc)

      await renderToString(app)

      const ssrStateService = app.config.globalProperties.$vueModelerDc.resolve(useSsrState)
      const ctxState: Record<string, unknown> = {}

      ssrStateService.injectState(ctxState)

      expect(ctxState.__SSR_STATE__).toEqual({ model: { id: 1 } })
    } finally {
      windowSpy.mockRestore()
    }
  })
})
