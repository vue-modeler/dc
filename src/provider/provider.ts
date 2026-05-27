import { getCurrentScope, onScopeDispose } from 'vue'

import { getContainer } from '../container/container-stack'
import {
  DepFactory,
  Provider,
  ProviderOptions,
} from '../types'

export function provider<Target> (
  initialFactory: DepFactory<Target>,
  options: ProviderOptions = { persistentInstance: false },
): Provider<Target> {
  const providerKey = options.key ?? Symbol('provider')
  let currentFactory = initialFactory
  let redifined = false

  const provider = ((): Target => {
    const dc = getContainer()
    let dependencyDescriptor = dc.get<Target>(provider)

    if (!dependencyDescriptor) {
      dependencyDescriptor = dc.register(provider, currentFactory)
      redifined = false
    } else if (redifined) {
      throw new Error('Provider was redefine after creation instance')
    }

    if (options.persistentInstance || getCurrentScope() === undefined) {
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

      dc.delete(providerKey)
    })

    return dependencyDescriptor.instance
  }) as Provider<Target>

  Object.defineProperties(provider, {
    __isProvider__: {
      value: true,
      configurable: false,
      writable: false,
      enumerable: false,
    },
    asKey: {
      value: providerKey,
      configurable: false,
      writable: false,
      enumerable: false,
    },
    redefine: {
      value: (factory: DepFactory<Target>) => {
        const prevFactory = currentFactory
        currentFactory = ({ dc }) => factory({ dc, prevFactory })
        redifined = true
      },
    },
  })

  return provider
}
