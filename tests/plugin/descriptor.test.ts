import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Descriptor } from '../../src/plugin/descriptor'
import { EffectScope, effectScope, onScopeDispose } from 'vue'

// Mock Vue's effectScope and onScopeDispose
vi.mock('vue', () => ({
  effectScope: vi.fn(),
  onScopeDispose: vi.fn(),
}))

describe('Descriptor', () => {
  let mockFactory: ReturnType<typeof vi.fn>
  let mockInstance: { destructor?: ReturnType<typeof vi.fn> }
  let mockEffectScope: { run: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockFactory = vi.fn()
    mockInstance = {}
    mockEffectScope = { run: vi.fn(), stop: vi.fn() }
    ;(effectScope as ReturnType<typeof vi.fn>).mockReturnValue(mockEffectScope)
    mockEffectScope.run.mockReturnValue(mockInstance)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should create an instance using the factory', () => {
    const descriptor = new Descriptor(mockFactory)
    expect(effectScope).toHaveBeenCalledWith(true)
    expect(mockEffectScope.run).toHaveBeenCalled()
    expect(descriptor.instance).toBe(mockInstance)
  })

  it('should throw an error if factory returns undefined', () => {
    mockEffectScope.run.mockReturnValue(undefined)
    expect(() => new Descriptor(mockFactory)).toThrow('Factory has not created model instance')
  })

  it('should increment parentScopeCount when subscribeOnParentScopeDispose is called', () => {
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    expect(descriptor.parentScopeCount).toBe(1)
    expect(onScopeDispose).toHaveBeenCalled()
  })

  it('should call disposeScope when onParentScopeDispose callback is triggered', () => {
    const descriptor = new Descriptor(mockFactory)
    const disposeScopeSpy = vi.spyOn(descriptor as any, 'disposeScope')
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    const disposeFn = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    disposeFn()
    expect(disposeScopeSpy).toHaveBeenCalled()
  })

  it('should call instance destructor if it exists', () => {
    mockInstance.destructor = vi.fn()
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    const disposeFn = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    disposeFn()
    expect(mockInstance.destructor).toHaveBeenCalled()
  })

  it('should not throw when calling destructor on an instance without a destructor method', () => {
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    const disposeFn = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(() => disposeFn()).not.toThrow()
  })

  it('should dispose the scope when all parent scopes are disposed', () => {
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    const disposeFn = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    disposeFn()
    expect(mockEffectScope.stop).toHaveBeenCalled()
  })

  it('should not dispose the scope if there are remaining parent scopes', () => {
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    const disposeFn = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    disposeFn()
    expect(mockEffectScope.stop).not.toHaveBeenCalled()
  })

  it('should correctly handle multiple subscriptions and disposals', () => {
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    
    expect(descriptor.parentScopeCount).toBe(2)

    const disposeFn1 = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const disposeFn2 = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[1][0]

    disposeFn1()
    expect(descriptor.parentScopeCount).toBe(1)
    expect(mockEffectScope.stop).not.toHaveBeenCalled()

    disposeFn2()
    expect(descriptor.parentScopeCount).toBe(0)
    expect(mockEffectScope.stop).toHaveBeenCalled()
  })

  it('should call instance destructor only when the last parent scope is disposed', () => {
    mockInstance.destructor = vi.fn()
    const descriptor = new Descriptor(mockFactory)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)
    descriptor.subscribeOnParentScopeDispose(onScopeDispose as any)

    const disposeFn1 = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const disposeFn2 = (onScopeDispose as ReturnType<typeof vi.fn>).mock.calls[1][0]

    disposeFn1()
    expect(mockInstance.destructor).not.toHaveBeenCalled()

    disposeFn2()
    expect(mockInstance.destructor).toHaveBeenCalled()
  })

  // Add new tests here based on the changes you've made to the Descriptor class
})
