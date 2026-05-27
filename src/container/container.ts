import { popContainer, pushContainer } from './container-stack'
import { DepFactory, DependencyDescriptor, Provider } from '../types'
import { Descriptor } from './descriptor'
import type { DependencyContainerInternal } from '../types'

export class Container implements DependencyContainerInternal {
  protected itemsByKey = new Map<symbol, Descriptor<unknown>>()

  protected resolveSymbolKey<Target> (key: symbol | Provider<Target>): symbol {
    return typeof key === 'symbol' ? key : key.asKey
  }

  delete<Target> (key: symbol | Provider<Target>): boolean {
    return this.itemsByKey.delete(this.resolveSymbolKey(key))
  }

  get<Target> (key: symbol | Provider<Target>): DependencyDescriptor<Target> | undefined {
    return this.itemsByKey.get(this.resolveSymbolKey(key)) as DependencyDescriptor<Target> | undefined
  }

  resolve<Target> (key: symbol | Provider<Target>): Target {
    const existing = this.get<Target>(key)

    if (existing) {
      return existing.instance
    }

    if (typeof key === 'symbol') {
      throw new Error('Dependency descriptor not found for symbol key')
    }

    try {
      pushContainer(this)
      return key()
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

    existing?.disposeForReplace()

    const descriptor = new Descriptor(this, factory)
    this.itemsByKey.set(symbolKey, descriptor)

    return descriptor
  }

  get size (): number {
    return this.itemsByKey.size
  }
}
