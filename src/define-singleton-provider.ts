import { getContainer } from './get-container'
import { DependencyFactory, Provider } from './types'

export function defineSingletonProvider<Target> (
  factory: DependencyFactory<Target>,
): Provider<Target> {
  return (): Target => {
    const container = getContainer()
    const dependencyDescriptor = container.get<Target>(factory) ?? container.add(factory)

    return dependencyDescriptor.instance
  }
}
