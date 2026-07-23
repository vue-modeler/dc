import type { VueApp } from '../vue-app'

import { popContainer, pushContainer } from './container-stack'
import { getProviderByAliasKey } from '../provider/provider-aliases'
import { DepFactory, DependencyDescriptor, Provider } from '../types'
import { Descriptor } from './descriptor'
import type { DependencyContainerInternal } from '../types'

export class Container implements DependencyContainerInternal {
  protected itemsByKey = new Map<symbol, Descriptor<unknown>>()
  protected constructingKeys = new Set<symbol>()
  protected _vueApp: VueApp | undefined

  get vueApp (): VueApp | undefined {
    return this._vueApp
  }

  bindVueApp (app: VueApp): void {
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

  resolve<Target> (keyOrProvider: symbol | Provider<Target>): Target {
    const depDescriptor = this.get<Target>(keyOrProvider)

    if (depDescriptor) {
      return depDescriptor.instance
    }

    const provider = typeof keyOrProvider === 'symbol' 
      ? getProviderByAliasKey<Target>(keyOrProvider)
      : keyOrProvider
        
    if (!provider) {
      throw new Error('Dependency descriptor not found for symbol key')
    }

    try {
      pushContainer(this)
      return provider()
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
