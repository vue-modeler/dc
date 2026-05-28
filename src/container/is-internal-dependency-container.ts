import { Container } from './container'
import type { DependencyContainerInternal } from '../types'

export function isInternalDependencyContainer (value: unknown): value is DependencyContainerInternal {
  if (value instanceof Container) {
    return true
  }

  const v = value as Record<string, unknown> | null | undefined
  return !!v
    && typeof v.resolve === 'function'
    && typeof v.get === 'function'
    && typeof v.register === 'function'
    && typeof v.delete === 'function'
    && typeof v.bindVueApp === 'function'
    && 'size' in v
    && 'vueApp' in v
}

