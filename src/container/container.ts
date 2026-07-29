import type { EffectScope } from 'vue'
import type { Vue as VueInstance } from 'vue/types/vue'

import { popContainer, pushContainer } from './container-stack'
import { getProviderByAliasKey } from '../provider/provider-aliases'
import { DepFactory, DependencyDescriptor, Provider } from '../types'
import { Descriptor } from './descriptor'
import type { DependencyContainerInternal } from '../types'

export class Container implements DependencyContainerInternal {
  protected itemsByKey = new Map<symbol, Descriptor<unknown>>()
  protected constructingKeys = new Set<symbol>()
  protected _vueApp: VueInstance | undefined

  get vueApp (): VueInstance | undefined {
    return this._vueApp
  }

  bindVueApp (app: VueInstance): void {
    this._vueApp = app
  }

  protected resolveSymbolKey<Target> (key: symbol | Provider<Target>): symbol {
    if (typeof key !== 'symbol') {
      return key.asKey
    }

    const aliasedProvider = getProviderByAliasKey(key)

    return aliasedProvider?.asKey ?? key
  }

  delete<Target> (key: symbol | Provider<Target>): boolean {
    return this.itemsByKey.delete(this.resolveSymbolKey(key))
  }

  get<Target> (key: symbol | Provider<Target>): DependencyDescriptor<Target> | undefined {
    return this.itemsByKey.get(this.resolveSymbolKey(key)) as DependencyDescriptor<Target> | undefined
  }

  resolve<Target> (
    keyOrProvider: symbol | Provider<Target>,
    scope?: EffectScope,
  ): Target {
    const providerFn = typeof keyOrProvider === 'symbol'
      ? getProviderByAliasKey<Target>(keyOrProvider)
      : keyOrProvider

    if (!providerFn) {
      throw new Error('Dependency descriptor not found for symbol key')
    }

    try {
      pushContainer(this)
      if (scope) {
        const result = scope.run(() => providerFn())
        if (!result) {
          throw new Error('Cannot resolve in an inactive EffectScope')
        }

        return result
      }
      return providerFn()
    } finally {
      popContainer()
    }
  }

  register <Target> (
    key: symbol | Provider<Target>,
    factory: DepFactory<Target>,
  ): DependencyDescriptor<Target> {
    const symbolKey = this.resolveSymbolKey(key)
    const existing = this.get<Target>(symbolKey)

    if (existing?.factory === factory) {
      return existing
    }

    if (this.constructingKeys.has(symbolKey)) {
      throw new Error('Cyclic dependency detected while creating provider instance')
    }

    existing?.disposeForReplace()

    this.constructingKeys.add(symbolKey)
    try {
      const descriptor = new Descriptor(this, factory)
      this.itemsByKey.set(symbolKey, descriptor)
      return descriptor
    } finally {
      this.constructingKeys.delete(symbolKey)
    }
  }

  get size (): number {
    return this.itemsByKey.size
  }
}
