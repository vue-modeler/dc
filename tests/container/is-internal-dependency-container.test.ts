import { describe, it, expect, vi } from 'vitest'

import { Container } from '../../src/container/container'
import { isInternalDependencyContainer } from '../../src/container/is-internal-dependency-container'
import type { DependencyContainerInternal } from '../../src/types'

describe('isInternalDependencyContainer', () => {
  it('should return true for Container instance', () => {
    expect(isInternalDependencyContainer(new Container())).toBe(true)
  })

  it('should return true for object with internal API shape', () => {
    const value: DependencyContainerInternal = {
      resolve: vi.fn(),
      get: vi.fn(),
      register: vi.fn(),
      delete: vi.fn(),
      size: 0,
    } as unknown as DependencyContainerInternal

    expect(isInternalDependencyContainer(value)).toBe(true)
  })

  it('should return false for invalid values', () => {
    expect(isInternalDependencyContainer(null)).toBe(false)
    expect(isInternalDependencyContainer({})).toBe(false)
    expect(isInternalDependencyContainer({ get: () => undefined })).toBe(false)
  })
})

