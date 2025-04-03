import { DependencyFactory, Provider } from '../types'
import { Descriptor } from './descriptor'

export class DescriptorsContainer {
  protected items = new Map<symbol, Descriptor<unknown>>()

  get size (): number {
    return this.items.size
  }

  delete<Target> (key: Provider<Target>['asKey']): boolean {
    return this.items.delete(key)
  }

  get<Target> (key: Provider<Target>['asKey']): Descriptor<Target> | undefined {
    return this.items.get(key) as Descriptor<Target> | undefined
  }

  add <Target> (
    key: Provider<Target>['asKey'],
    factory: DependencyFactory<Target>,
  ): Descriptor<Target> {
    if (this.items.has(key)) {
      return this.items.get(key) as Descriptor<Target>
    }

    const descriptor = new Descriptor(factory)
    this.items.set(key, descriptor)

    return descriptor
  }
}
