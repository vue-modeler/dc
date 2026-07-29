import { effectScope, getCurrentScope, onScopeDispose, type EffectScope } from 'vue'

import { DependencyContainer, DependencyDescriptor, DepFactory } from '../types'

export class Descriptor<Target> implements DependencyDescriptor<Target> {
  protected _parentScopeCount = 0
  protected parentScopes = new WeakSet<EffectScope>()
  protected _instance: Target
  protected _instanceScope: EffectScope
  readonly factory: unknown
  
  constructor (
    readonly dc: DependencyContainer,
    factory: DepFactory<Target>,
  ) {
    this.factory = factory
    this._instanceScope = effectScope(true)
    const instance = this._instanceScope.run<Target>(() => factory({ dc }))

    if (instance instanceof Promise) {
      throw new Error('Dependency factory must be synchronous and must not return a Promise')
    }

    if (!instance) {
      throw new Error('Factory has not created model instance')
    }

    this._instance = instance
  }

  get instance (): Target {
    return this._instance
  }

  get parentScopeCount (): number {
    return this._parentScopeCount
  }

  subscribeOnParentScopeDispose (onParentScopeDispose: typeof onScopeDispose): boolean {
    const parentScope = getCurrentScope()
    if (parentScope && this.parentScopes.has(parentScope)) {
      return false
    }

    if (parentScope) {
      this.parentScopes.add(parentScope)
    }

    this._parentScopeCount++
    
    // this is potential memory leak, because we don't know
    // if the parent scope will be disposed
    onParentScopeDispose(() => { this.disposeScope() })

    return true
  }

  protected callInstanceDestructor (instance: unknown): void {
    const hasDestructor = instance 
      && typeof instance === 'object' 
      && 'destructor' in instance 
      && typeof instance.destructor === 'function'

    if (!hasDestructor) {
      return
    }

    (instance.destructor as () => void)() 
  }

  protected disposeScope (): void {
    if (--this._parentScopeCount > 0) {
      return
    }

    this.disposeInstance()
  }

  /** Disposes instance when descriptor is replaced after redefine. */
  disposeForReplace (): void {
    this._parentScopeCount = 0
    this.disposeInstance()
  }

  protected disposeInstance (): void {
    this._instanceScope.stop()
    this.callInstanceDestructor(this._instance)
  }
}
