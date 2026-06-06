import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentInstance, getCurrentScope, inject, onScopeDispose } from 'vue'

import { Container } from '../../src/container/container'
import {
  getProviderByAliasKey,
  registerProviderAlias,
} from '../../src/provider/provider-aliases'
import { provider } from '../../src/provider/provider'
import type { ProviderOptions } from '../../src/types'

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    getCurrentInstance: vi.fn(),
    getCurrentScope: vi.fn(actual.getCurrentScope),
    inject: vi.fn(),
    onScopeDispose: vi.fn(actual.onScopeDispose),
  } satisfies typeof import('vue')
})

describe('provider aliases', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
    vi.mocked(getCurrentInstance).mockReset()
    vi.mocked(getCurrentInstance).mockReturnValue(
      { proxy: { $vueModelerDc: container } } as unknown as ReturnType<typeof getCurrentInstance>,
    )
    vi.mocked(getCurrentScope).mockImplementation((async () => {
      const actual = await vi.importActual<typeof import('vue')>('vue')
      return actual.getCurrentScope()
    }) as unknown as typeof getCurrentScope)
    vi.mocked(inject).mockReset()
    vi.mocked(onScopeDispose).mockClear()
  })

  describe('registerProviderAlias / getProviderByAliasKey', () => {
    it('stores a provider under the alias key', () => {
      const aliasKey = Symbol('alias')
      const useDependency = provider(() => 'value')

      registerProviderAlias([aliasKey], useDependency)

      expect(getProviderByAliasKey(aliasKey)).toBe(useDependency)
    })

    it('returns undefined for an unregistered key', () => {
      expect(getProviderByAliasKey(Symbol('missing'))).toBeUndefined()
    })

    it('allows registering the same alias for the same provider again', () => {
      const aliasKey = Symbol('alias')
      const useDependency = provider(() => 'value')

      registerProviderAlias([aliasKey], useDependency)

      expect(() => {
        registerProviderAlias([aliasKey], useDependency)
      }).not.toThrow()
      expect(getProviderByAliasKey(aliasKey)).toBe(useDependency)
    })

    it('allows multiple alias keys for one provider', () => {
      const firstAlias = Symbol('first')
      const secondAlias = Symbol('second')
      const useDependency = provider(() => 'value')

      useDependency.assignKey(firstAlias)
      useDependency.assignKey(secondAlias)

      expect(getProviderByAliasKey(firstAlias)).toBe(useDependency)
      expect(getProviderByAliasKey(secondAlias)).toBe(useDependency)
    })

    it('registers multiple alias keys in a single assignKey call', () => {
      const firstAlias = Symbol('first')
      const secondAlias = Symbol('second')
      const thirdAlias = Symbol('third')
      const useDependency = provider(() => 'value')

      useDependency.assignKey(firstAlias, secondAlias, thirdAlias)

      expect(getProviderByAliasKey(firstAlias)).toBe(useDependency)
      expect(getProviderByAliasKey(secondAlias)).toBe(useDependency)
      expect(getProviderByAliasKey(thirdAlias)).toBe(useDependency)
    })

    it('resolves the same instance for every key from a single assignKey call', () => {
      const firstAlias = Symbol('first')
      const secondAlias = Symbol('second')
      const instance = { id: 'multi-alias' }
      const useDependency = provider(() => instance)

      useDependency.assignKey(firstAlias, secondAlias)

      expect(container.resolve(firstAlias)).toBe(instance)
      expect(container.resolve(secondAlias)).toBe(instance)
      expect(container.resolve(useDependency)).toBe(instance)
      expect(container.size).toBe(1)
    })

    it('throws when the alias key belongs to another provider', () => {
      const aliasKey = Symbol('shared')
      const useFirst = provider(() => 'first')
      const useSecond = provider(() => 'second')

      registerProviderAlias([aliasKey], useFirst)

      expect(() => {
        registerProviderAlias([aliasKey], useSecond)
      }).toThrow(
        'Provider alias key is already assigned to another provider',
      )
    })
  })

  describe('assignKey', () => {
    it('does not change the provider asKey', () => {
      const customKey = Symbol('custom')
      const aliasKey = Symbol('alias')
      const options: ProviderOptions = { key: customKey }
      const useDependency = provider(() => 'value', options)

      useDependency.assignKey(aliasKey)

      expect(useDependency.asKey).toBe(customKey)
      expect(useDependency.asKey).not.toBe(aliasKey)
    })

    it('resolves nested dependencies through an alias key', () => {
      const aliasKey = Symbol('parent-alias')
      const useChild = provider(() => ({ role: 'child' }))
      const useParent = provider(() => ({
        child: useChild(),
      }))

      useParent.assignKey(aliasKey)

      const viaAlias = container.resolve<{ child: { role: string } }>(aliasKey)

      expect(viaAlias.child).toEqual({ role: 'child' })
      expect(container.size).toBe(2)
    })

    it('deletes the descriptor by alias key', () => {
      const aliasKey = Symbol('alias')
      const useDependency = provider(() => ({ id: 'value' }))

      useDependency.assignKey(aliasKey)
      container.resolve(useDependency)

      expect(container.delete(aliasKey)).toBe(true)
      expect(container.get(useDependency)).toBeUndefined()
      expect(container.get(aliasKey)).toBeUndefined()
    })

    it('returns undefined from get before the alias is resolved', () => {
      const aliasKey = Symbol('alias')
      const useDependency = provider(() => ({ id: 'lazy' }))

      useDependency.assignKey(aliasKey)

      expect(container.get(aliasKey)).toBeUndefined()
      expect(container.get(useDependency)).toBeUndefined()
    })
  })
})
