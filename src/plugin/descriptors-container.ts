import { DependencyFactory } from '../types'
import { Descriptor } from './descriptor'

export class DescriptorsContainer {
  protected items = new Map()

  get size (): number {
    return this.items.size
  }

  delete<Target> (key: DependencyFactory<Target>): boolean {
    return this.items.delete(key)
  }

  get<Target> (key: DependencyFactory<Target>): Descriptor<Target> | undefined {
    return this.items.get(key)
  }

  add <Target> (
    factory: DependencyFactory<Target>,
  ): Descriptor<Target> {
    const descriptor = new Descriptor(factory)
    this.items.set(descriptor.factory, descriptor)

    return descriptor
  }

  clean (): void {
    for (const descriptor of Object.values(this.items)) {
      descriptor.destructor()
    }

    this.items = new Map()
  }
}
