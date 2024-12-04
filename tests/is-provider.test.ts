import { describe, it, expect } from 'vitest'
import { isProvider } from '../src/is-provider'
import { provider } from '../src'

describe('isProvider function', () => {
  it('returns true for provider function', () => {
    const dependencyFactory = () => 'test'
    const useDependency = provider(dependencyFactory)
    
    expect(isProvider(useDependency)).toBe(true)
  })

  it('returns false for regular function', () => {
    const regularFunction = () => 'test'
    expect(isProvider(regularFunction)).toBe(false)
  })

  it('returns false for arrow function', () => {
    expect(isProvider(() => ({}))).toBe(false)
  })
}) 