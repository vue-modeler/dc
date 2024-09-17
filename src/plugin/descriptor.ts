import { EffectScope, effectScope } from 'vue'

import { DependencyFactory } from '../types'

export class Descriptor<Target> {
  protected _scopeCount = 0
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

  get scopeCount (): number {
    return this._scopeCount
  }

  subscribeOnScopeDispose (onScopeDispose: (subscriber: () => this) => void): void {
    this._scopeCount++
    onScopeDispose(() => {
      this.disposeScope()

      return this
    })
  }

  destructor (): void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const hasDestructor = 'destructor' in this.instance && typeof this.instance.destructor === 'function'

    if (!hasDestructor) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.instance.destructor()
  }

  protected disposeScope (): void {
    if (--this._scopeCount > 0) {
      return
    }

    this._instanceScope.stop()

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const hasDestructor = 'destructor' in this.instance && typeof this.instance.destructor === 'function'

    if (!hasDestructor) {
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.instance.destructor()
    } catch (error) {
      console.error(error)
    }
  }
}

