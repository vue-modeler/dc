import { EffectScope, effectScope } from 'vue'

export function createScope (): EffectScope {
  return effectScope(true)
}
