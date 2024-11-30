import { onScopeDispose } from 'vue'

import { getContainer } from './get-container'
import { DependencyFactory, Provider } from './types'

export function defineProvider<Target> (
  factory: DependencyFactory<Target>,
): Provider<Target> {
  const provider = (): Target => {
    const container = getContainer()

    const dependencyDescriptor = container.get<Target>(factory) || container.add(factory)
    
    // Order of operations is important here.
    // The functions registered with onScopeDispose are called in direct order
    // when the associated effect scope is stopped.
    // Therefore, we need to delete the dependency descriptor from the container
    // only after dependency descriptor subscriber is called.
    dependencyDescriptor.subscribeOnParentScopeDispose(onScopeDispose)
    onScopeDispose(() => {
      if (dependencyDescriptor.parentScopeCount > 0) {
        return
      }
      
      container.delete(dependencyDescriptor.factory)
    })
    
    
    return dependencyDescriptor.instance
  }

  // Provider is a function without arguments that returns a dependency instance.
  // To distinguish providers in runtime from other functions,
  // we add a special property to the function.
  provider.__isProvider__ = true

  return provider
}
  