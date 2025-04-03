import { onScopeDispose } from 'vue'

import { getContainer } from './get-container'
import { DependencyFactory, Provider, ProviderOptions } from './types'

export function provider<Target> (
  factory: DependencyFactory<Target>,
  options: ProviderOptions = { persistentInstance: false },
): Provider<Target> {
  const providerKey = Symbol('provider')

  const provider = (): Target => {
    const container = getContainer()

    const dependencyDescriptor = container.get<Target>(providerKey) || container.add(providerKey, factory)
    
    if (options.persistentInstance) {
      return dependencyDescriptor.instance
    }
    
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
      
      container.delete(providerKey)
    })
    
    
    return dependencyDescriptor.instance
  }

  // Provider is a function without arguments that returns a dependency instance.
  // To distinguish providers in runtime from other functions,
  // we add a special property to the function.
  provider.__isProvider__ = true
  
  Object.defineProperty(
    provider,
    'asKey',
    {
      value: providerKey,
      writable: false,
    },
  )

  return provider as unknown as Provider<Target>
}
