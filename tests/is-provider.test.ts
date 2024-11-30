import { describe, it, expect } from 'vitest'
import { isProvider } from '../src/is-provider'
import { defineProvider } from '../src/define-provider'

describe('isProvider function', () => {
  it('returns true for provider function', () => {
    const provider = defineProvider(() => 'test')
    expect(isProvider(provider)).toBe(true)
  })

  it('returns false for regular function', () => {
    const regularFunction = () => 'test'
    expect(isProvider(regularFunction)).toBe(false)
  })

  it('returns false for arrow function', () => {
    expect(isProvider(() => ({}))).toBe(false)
  })
}) 