import { EffectScope, effectScope, onScopeDispose } from 'vue'

import { DependencyFactory } from '../types'

export class Descriptor<Target> {
  protected _parentScopeCount = 0
  protected _instance: Target
  protected _instanceScope: EffectScope

  constructor (
    readonly factory: DependencyFactory<Target>,
  ) {
    this._instanceScope = effectScope(true)
    const instance = this._instanceScope.run<Target>(() => factory())

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

  subscribeOnParentScopeDispose (onParentScopeDispose: typeof onScopeDispose): void {
    this._parentScopeCount++
    
    // this is potential memory leak, because we don't know
    // if the parent scope will be disposed
    onParentScopeDispose(() => { this.disposeScope() })
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

    this._instanceScope.stop()
    
    this.callInstanceDestructor(this._instance)
  }
}
