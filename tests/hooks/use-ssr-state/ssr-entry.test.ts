import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue } from '@vue/test-utils'
import type Vue from 'vue'

import * as containerStack from '../../../src/container/container-stack'
import { useSsrState } from '../../../src/hooks/use-ssr-state/use-ssr-state'
import { SsrStateService } from '../../../src/hooks/use-ssr-state/ssr-state-service'
import { vueModelerDc } from '../../../src/plugin/vue-modeler-dc'
import type { DependencyContainerInternal } from '../../../src/types'

import '../../../src/vue.d.ts'

describe('useSsrState SSR entry', () => {
  let LocalVue: typeof Vue

  beforeEach(() => {
    LocalVue = createLocalVue()
    LocalVue.use(vueModelerDc)
  })

  it('resolves useSsrState in SSR entry outside Vue component context', () => {
    const app = new LocalVue({
      render: (h) => h('div'),
    })
    app.$mount()

    const ssrStateService = app.$vueModelerDc.resolve(useSsrState)

    expect(ssrStateService).toBeInstanceOf(SsrStateService)
    expect(app.$vueModelerDc.resolve(useSsrState)).toBe(ssrStateService)
  })

  it('resolves via container stack without Vue instance fallback', () => {
    const getContainerFromCurrentVueAppSpy = vi.spyOn(
      containerStack,
      'getContainerFromCurrentVueApp',
    ).mockImplementation(() => {
      throw new Error('getContainerFromCurrentVueApp should not be called')
    })

    const app = new LocalVue({
      render: (h) => h('div'),
    })
    app.$mount()

    expect(() => app.$vueModelerDc.resolve(useSsrState)).not.toThrow()
    expect(app.$vueModelerDc.resolve(useSsrState)).toBeInstanceOf(SsrStateService)
    expect(getContainerFromCurrentVueAppSpy).not.toHaveBeenCalled()

    getContainerFromCurrentVueAppSpy.mockRestore()
  })

  it('throws when useSsrState is called directly outside Vue component context', () => {
    expect(() => useSsrState()).toThrow('Vue Modeler DC plugin not installed')
  })

  it('fails on resolve when pushContainer and getContainer use separate module stacks', () => {
    // Simulate a real-world SSR bundling issue: the same package can be included twice
    // (e.g. CJS + ESM, or duplicated dependency graph). Each copy has its own module-level
    // singleton `containerStack`. If `pushContainer` writes to stack A, but `getContainer`
    // reads from stack B, then `provider()` will fall back to Vue context and throw.
    //
    // Fix in an app: ensure DI package is deduplicated in the bundler / lockfile so that
    // both `Container.resolve()` and `provider()` share the same module singleton stack.
    const moduleCopyA_stack: DependencyContainerInternal[] = []
    const moduleCopyB_stack: DependencyContainerInternal[] = []

    const pushContainerSpy = vi.spyOn(containerStack, 'pushContainer').mockImplementation((container) => {
      // container-stack.ts from module copy A
      moduleCopyA_stack.push(container)
    })
    const popContainerSpy = vi.spyOn(containerStack, 'popContainer').mockImplementation(() => {
      // container-stack.ts from module copy A
      moduleCopyA_stack.pop()
    })
    const getContainerSpy = vi.spyOn(containerStack, 'getContainer').mockImplementation(() => {
      // container-stack.ts from module copy B
      const fromModuleCopyB = moduleCopyB_stack.at(-1)

      if (fromModuleCopyB) {
        return fromModuleCopyB
      }

      return containerStack.getContainerFromCurrentVueApp()
    })

    const app = new LocalVue({
      render: (h) => h('div'),
    })
    app.$mount()

    expect(moduleCopyB_stack).toHaveLength(0)

    // `Container.resolve()` calls `pushContainer()` from module copy A, but `provider()` inside
    // `useSsrState` reads the current container via `getContainer()` from module copy B.
    // With an empty moduleCopyB_stack it falls back to Vue context and throws.
    expect(() => app.$vueModelerDc.resolve(useSsrState)).toThrow(
      'Vue Modeler DC plugin not installed',
    )
    expect(moduleCopyA_stack).toHaveLength(0)

    pushContainerSpy.mockRestore()
    popContainerSpy.mockRestore()
    getContainerSpy.mockRestore()
  })

  it('allows SSR entry to inject state registered during component render', () => {
    // SSR mode: `SsrStateService` only collects serializers on the server.
    const windowSpy = vi.spyOn(global, 'window', 'get').mockReturnValue(
      undefined as unknown as Window & typeof globalThis,
    )

    const TestComponent = {
      setup (): Record<string, never> {
        // During SSR render, providers run inside Vue setup and register into the app container.
        const ssrState = useSsrState()

        // Provider consumers register serializers while components are rendered.
        ssrState.addSerializer(() => ({
          extractionKey: 'model',
          value: { id: 1 },
        }))

        return {}
      },
      render (h: Vue.CreateElement): Vue.VNode {
        return h('div')
      },
    }

    const app = new LocalVue({
      render: (h) => h(TestComponent),
    })
    app.$mount()

    // SSR entry (outside Vue component context): resolve from the app container.
    const ssrStateService = app.$vueModelerDc.resolve(useSsrState)
    const ctxState: Record<string, unknown> = {}

    // The entry injects serialized state into the server context.
    ssrStateService.injectState(ctxState)

    expect(ctxState.__SSR_STATE__).toEqual({ model: { id: 1 } })

    windowSpy.mockRestore()
  })
})
