import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalVue, mount, shallowMount } from '@vue/test-utils'
import { vueModelerDc } from '../../src/plugin/vue-modeler-dc'
import '../../src/vue.d.ts'

// Mock DescriptorsContainer
vi.mock('../../src/plugin/descriptors-container', () => ({
  DescriptorsContainer: vi.fn().mockImplementation(function() {
    return Object.create(DescriptorsContainer.prototype);
  })
}))

// Import the mocked DescriptorsContainer
import { DescriptorsContainer } from '../../src/plugin/descriptors-container'

describe('vueModelerDc', () => {
  let LocalVue: any

  beforeEach(() => {
    LocalVue = createLocalVue()
    vi.clearAllMocks() // Clear all mocks before each test
  })

  it('should add $vueModelerDc and _vueModelerDcInstalled to Vue prototype', () => {
    vueModelerDc(LocalVue)
    
    expect(LocalVue.prototype).haveOwnPropertyDescriptor('$vueModelerDc')
    expect(LocalVue.prototype).haveOwnPropertyDescriptor('_vueModelerDcInstalled')
  })

  it('should set _vueModelerDcInstalled to true on first call', () => {
    expect(LocalVue.prototype._vueModelerDcInstalled).toBeUndefined()
    
    const spyOnMixin = vi.spyOn(LocalVue, 'mixin')
    vueModelerDc(LocalVue)
    
    expect(LocalVue.prototype._vueModelerDcInstalled).toBe(true)
    expect(spyOnMixin).toHaveBeenCalledOnce()
  })
  
  it('should not reinstall the plugin if already installed', () => {
    const LocalVue = createLocalVue()
    const spyOnMixin = vi.spyOn(LocalVue, 'mixin')
    
    vueModelerDc(LocalVue)
    vueModelerDc(LocalVue)
    
    expect(LocalVue.prototype._vueModelerDcInstalled).toBe(true)
    expect(spyOnMixin).toHaveBeenCalledOnce()
  })

  it('should initialize $vueModelerDc only after create Vue application instance', () => {
    LocalVue.use(vueModelerDc)

    const appInstance = new LocalVue()
    
    expect(DescriptorsContainer).toHaveBeenCalledTimes(1)
    expect(appInstance.$vueModelerDc).toBeDefined()
    expect(appInstance.$vueModelerDc).toBeInstanceOf(DescriptorsContainer)
  })

  
  it('should define $vueModelerDc property on the component', () => {
    LocalVue.use(vueModelerDc)

    const TestComponent = {
      template: '<div></div>'
    }

    const wrapper = shallowMount(TestComponent, { localVue: LocalVue })

    expect(DescriptorsContainer).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.$vueModelerDc).toBeDefined()
    expect(wrapper.vm.$vueModelerDc).toBeInstanceOf(DescriptorsContainer)
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
    
    expect(DescriptorsContainer).toHaveBeenCalledTimes(2)
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
    
    expect(DescriptorsContainer).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.$vueModelerDc).toBeDefined()
    expect(childWrapper.$vueModelerDc).toBeDefined()
    expect(childWrapper.$vueModelerDc).toBe(wrapper.vm.$vueModelerDc)
  })
})
