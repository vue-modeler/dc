import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, shallowMount } from '@vue/test-utils'
import { vueModelerDc } from '../../src/plugin/vue-modeler-dc'
import { DependencyContainerInternal } from '../../src/types'

import '../../src/vue.d.ts'

// Mock Container
vi.mock('../../src/container/container', () => {
  // type ContainerInstance = Record<string, unknown>
  //   & { get: unknown; register: unknown; delete: unknown; resolve: unknown }

  const Container = vi.fn().mockImplementation(function () {
    return Object.create(Container.prototype as object) as DependencyContainerInternal
  })

  return { Container }
})

// Import the mocked Container
import { Container } from '../../src/container/container'

describe('vueModelerDc', () => {
  let LocalVue: ReturnType<typeof createLocalVue>

  beforeEach(() => {
    LocalVue = createLocalVue()
    vi.clearAllMocks() // Clear all mocks before each test
  })

  it('should add $vueModelerDc and _vueModelerDcInstalled to Vue prototype', () => {
    vueModelerDc(LocalVue)
    
    expect(LocalVue.prototype).haveOwnPropertyDescriptor('$vueModelerDc')
    expect(LocalVue.prototype).haveOwnPropertyDescriptor('_vueModelerDcInstalled')
  })

  it('should not reinstall the plugin if already installed', () => {
    const LocalVue = createLocalVue()
    const spyOnMixin = vi.spyOn(LocalVue, 'mixin')
    
    vueModelerDc(LocalVue)
    vueModelerDc(LocalVue)
    
    expect(spyOnMixin).toHaveBeenCalledOnce()
  })

  it('should initialize $vueModelerDc only after create Vue application instance', () => {
    LocalVue.use(vueModelerDc)

    const appInstance = new LocalVue()
    
    expect(Container).toHaveBeenCalledTimes(1)
    expect(appInstance.$vueModelerDc).toBeDefined()
    expect(appInstance.$vueModelerDc).toBeInstanceOf(Container)
  })

  it('should use container passed from root Vue instance options', () => {
    const providedContainer = new Container()

    LocalVue.use(vueModelerDc)

    const appInstance = new LocalVue({
      vueModelerDc: { dc: providedContainer },
    } as unknown as Record<string, unknown>)

    expect(appInstance.$vueModelerDc).toBe(providedContainer)
  })

  it('should throw if invalid dc is provided via root Vue instance options', () => {
    LocalVue.use(vueModelerDc)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      new LocalVue({
        vueModelerDc: { dc: {} as unknown as DependencyContainerInternal },
      } as unknown as Record<string, unknown>)

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(
        consoleErrorSpy.mock.calls
          .flat()
          .some((arg) =>
            typeof arg === 'string'
              && arg.includes('Invalid `vueModelerDc.dc` option: expected a container compatible with internal container API'),
          ),
      ).toBe(true)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it('should not override pre-existing _vueModelerDc on instance/prototype', () => {
    LocalVue.use(vueModelerDc)

    const preexisting = new Container()
    ;(LocalVue.prototype as unknown as { _vueModelerDc?: unknown })._vueModelerDc = preexisting

    const appInstance = new LocalVue()

    expect(Container).toHaveBeenCalledTimes(1) // only the preexisting instance above
    expect(appInstance.$vueModelerDc).toBe(preexisting)
  })

  it('should throw from $vueModelerDc getter if beforeCreate did not initialize container', () => {
    LocalVue.use(vueModelerDc)

    expect(() => {
      // Accessing getter on prototype bypasses beforeCreate lifecycle hook
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ;(LocalVue.prototype as unknown as { $vueModelerDc: unknown }).$vueModelerDc
    }).toThrow(
      'vueModelerDc: container is not initialized (expected vueModelerDc beforeCreate mixin to run and set `_vueModelerDc`)',
    )
  })

  it('should define $vueModelerDc property on the component', () => {
    LocalVue.use(vueModelerDc)

    const TestComponent = {
      template: '<div></div>'
    }

    const wrapper = shallowMount(TestComponent, { localVue: LocalVue })

    expect(Container).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.$vueModelerDc).toBeDefined()
    expect(wrapper.vm.$vueModelerDc).toBeInstanceOf(Container)
  })

  it('should create unique DescriptorsContainer instances for different localVue instances', () => {
    const localVue1 = createLocalVue()
    const localVue2 = createLocalVue()

    localVue1.use(vueModelerDc)
    localVue2.use(vueModelerDc)

    const TestComponent = {
      template: '<div></div>'
    }

    const wrapper1 = shallowMount(TestComponent, { localVue: localVue1 })
    const wrapper2 = shallowMount(TestComponent, { localVue: localVue2 })

    expect(wrapper1.vm.$vueModelerDc).toBeDefined()
    expect(wrapper2.vm.$vueModelerDc).toBeDefined()
    expect(wrapper1.vm.$vueModelerDc).not.toBe(wrapper2.vm.$vueModelerDc)
    
    expect(Container).toHaveBeenCalledTimes(2)
  })

  it('should create single instance of DescriptorsContainer for nested components', () => {
    LocalVue.use(vueModelerDc)

    const ParentComponent = {
      template: '<div><child-component /></div>',
      components: {
        'child-component': {
          template: '<div></div>'
        }
      }
    }

    const wrapper = shallowMount(ParentComponent, { localVue: LocalVue })
    
    // Force mount the child component
    const childWrapper = wrapper.findComponent({ name: 'child-component' }).vm.$mount()
    
    expect(Container).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.$vueModelerDc).toBeDefined()
    expect(childWrapper.$vueModelerDc).toBeDefined()
    expect(childWrapper.$vueModelerDc).toBe(wrapper.vm.$vueModelerDc)
  })

  it('should create unique Container instances for each app root instance', () => {
    LocalVue.use(vueModelerDc)

    const firstApp = new LocalVue()
    const secondApp = new LocalVue()

    expect(firstApp.$vueModelerDc).not.toBe(secondApp.$vueModelerDc)
  })
})
