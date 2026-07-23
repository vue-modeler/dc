import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { vueModelerDc } from '../../src/plugin/vue-modeler-dc'
import type { DependencyContainerInternal } from '../../src/types'

import '../../src/vue.d.ts'

vi.mock('../../src/container/container', () => {
  const Container = vi.fn().mockImplementation(function () {
    return Object.create(Container.prototype as object) as DependencyContainerInternal
  })

  ;(Container.prototype as { bindVueApp: (app: unknown) => void }).bindVueApp = vi.fn()

  return { Container }
})

import { Container } from '../../src/container/container'

describe('vueModelerDc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set $vueModelerDc on globalProperties and provide the container', () => {
    const app = createApp({ render: () => h('div') })
    app.use(vueModelerDc)

    expect(app.config.globalProperties.$vueModelerDc).toBeInstanceOf(Container)
    expect(Container).toHaveBeenCalledTimes(1)
    expect(Container.prototype.bindVueApp).toHaveBeenCalledWith(app)
  })

  it('should not reinstall the plugin on the same app', () => {
    const app = createApp({ render: () => h('div') })

    vueModelerDc.install?.(app)
    vueModelerDc.install?.(app)

    expect(Container).toHaveBeenCalledTimes(1)
  })

  it('should use container passed via install options', () => {
    const providedContainer = new Container()
    const app = createApp({ render: () => h('div') })

    app.use(vueModelerDc, { dc: providedContainer })

    expect(app.config.globalProperties.$vueModelerDc).toBe(providedContainer)
    expect(providedContainer.bindVueApp).toHaveBeenCalledWith(app)
  })

  it('should throw if invalid dc is provided via install options', () => {
    const app = createApp({ render: () => h('div') })

    expect(() => {
      app.use(vueModelerDc, { dc: {} as unknown as DependencyContainerInternal })
    }).toThrow(
      'Invalid `vueModelerDc.dc` option: expected a container compatible with internal container API',
    )
  })

  it('should expose $vueModelerDc on mounted components', () => {
    const TestComponent = defineComponent({
      template: '<div></div>',
    })

    const wrapper = mount(TestComponent, { global: { plugins: [[vueModelerDc]] } })

    expect(wrapper.vm.$vueModelerDc).toBeDefined()
    expect(wrapper.vm.$vueModelerDc).toBeInstanceOf(Container)
  })

  it('should create unique Container instances for different apps', () => {
    const app1 = createApp({ render: () => h('div') })
    const app2 = createApp({ render: () => h('div') })

    app1.use(vueModelerDc)
    app2.use(vueModelerDc)

    expect(app1.config.globalProperties.$vueModelerDc).toBeDefined()
    expect(app2.config.globalProperties.$vueModelerDc).toBeDefined()
    expect(app1.config.globalProperties.$vueModelerDc)
      .not.toBe(app2.config.globalProperties.$vueModelerDc)
    expect(Container).toHaveBeenCalledTimes(2)
  })

  it('should share a single Container for nested components in one app', () => {
    const ChildComponent = defineComponent({
      name: 'ChildComponent',
      template: '<div></div>',
    })

    const ParentComponent = defineComponent({
      components: { ChildComponent },
      template: '<div><child-component /></div>',
    })

    const wrapper = mount(ParentComponent, {
      global: { plugins: [[vueModelerDc]] },
    })

    const child = wrapper.findComponent({ name: 'ChildComponent' })

    expect(Container).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.$vueModelerDc).toBeDefined()
    expect(child.vm.$vueModelerDc).toBe(wrapper.vm.$vueModelerDc)
  })
})
