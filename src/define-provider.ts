import { onScopeDispose } from 'vue'

import { getContainer } from './get-container'
import { DependencyFactory, Provider } from './types'

export function defineProvider<Target> (
  factory: DependencyFactory<Target>,
): Provider<Target> {
  return (): Target => {
    const container = getContainer()

    const dependencyDescriptor = container.get<Target>(factory) || container.add(factory)

    dependencyDescriptor.subscribeOnScopeDispose(
      (scopeDisposeSubscriber) => {
        onScopeDispose(
          () => {
            const descriptor = scopeDisposeSubscriber()

            if (descriptor.scopeCount) {
              return
            }

            container.delete(descriptor.factory)
          },
        )
      },
    )

    return dependencyDescriptor.instance
  }
}
