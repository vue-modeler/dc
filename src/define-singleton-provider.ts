import { getContainer } from './get-container'
import { DependencyFactory, Provider } from './types'

export function defineSingletonProvider<Target> (
  factory: DependencyFactory<Target>,
): Provider<Target> {
  return (): Target => {
    const scopedDc = getContainer()
    const dependencyDescriptor = scopedDc.get<Target>(factory) || scopedDc.add(factory)

    return dependencyDescriptor.instance
  }
}
