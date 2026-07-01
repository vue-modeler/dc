import type { Provider } from '../types'

const aliases = new Map<symbol, Provider<unknown>>()

export function registerProviderAlias<Target> (
  keys: symbol[],
  provider: Provider<Target>,
): void {
  keys.forEach(key => {
    const existing = aliases.get(key)

    if (existing && existing !== provider) {
      throw new Error('Provider alias key is already assigned to another provider')
    }

    aliases.set(key, provider as Provider<unknown>)
  })
}

export function getProviderByAliasKey<Target> (key: symbol): Provider<Target> | undefined {
  return aliases.get(key) as Provider<Target> | undefined
}
