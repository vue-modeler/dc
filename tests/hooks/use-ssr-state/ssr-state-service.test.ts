import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SsrStateService } from '../../../src/hooks/use-ssr-state/ssr-state-service'

describe('SsrStateService', () => {
  let service: SsrStateService

  beforeEach(() => {
    // Reset global state
    globalThis.__INITIAL_STATE__ = undefined
  })

  describe('on server', () => {
    beforeEach(() => {
      vi.spyOn(global, 'window', 'get').mockReturnValue(undefined as unknown as Window & typeof globalThis)
      service = new SsrStateService()
    })

    it('should add and remove serializers', () => {
      const serializer = () => ({ extractionKey: 'test', value: 'value' })
      service.addSerializer(serializer)
      expect(service.removeSerializer(serializer)).toBe(true)
    })

    it('should modify state for injection from all serializers', () => {
      const serializer1 = () => ({ extractionKey: 'test1', value: 'value1' })
      const serializer2 = () => ({ extractionKey: 'test2', value: 'value2' })
      
      service.addSerializer(serializer1)
      service.addSerializer(serializer2)

      const stateForInject: Record<string, unknown> = {}
      service.injectState(stateForInject)
      
      expect('__SSR_STATE__' in stateForInject).toBe(true)
      expect(stateForInject.__SSR_STATE__).toEqual({
        test1: 'value1',
        test2: 'value2'
      })
    })

    it('should skip undefined serializer values during injection', () => {
      service.addSerializer(() => ({
        extractionKey: 'ignored',
        value: undefined,
      }))
      service.addSerializer(() => ({
        extractionKey: 'kept',
        value: 'value',
      }))

      const stateForInject: Record<string, unknown> = {}
      service.injectState(stateForInject)

      expect(stateForInject.__SSR_STATE__).toEqual({
        kept: 'value',
      })
    })
  })

  describe('on client', () => {
    beforeEach(() => {
      vi.spyOn(global, 'window', 'get').mockReturnValue({} as Window & typeof globalThis)
      service = new SsrStateService()
    })

    it('does not inject serialized state on the client', () => {
      const stateForInject: Record<string, unknown> = {}

      service.injectState(stateForInject)

      expect(stateForInject).toEqual({})
    })

    it('should not add or remove serializers', () => {
      interface TestValue {
        prop1: string
        prop2: number
      }
      
      const serializer = () => ({ 
        extractionKey: 'test', 
        value: {
          prop1: 'value1',
          prop2: 123
        } as TestValue
      })
      
      service.addSerializer<TestValue>(serializer)
      expect(service.removeSerializer(serializer)).toBe(false)
    })

    it('should extract state from string initial state', () => {
      const initialState = {
        __SSR_STATE__: {
          test: 'value'
        }
      }
      globalThis.__INITIAL_STATE__ = JSON.stringify(initialState)

      service = new SsrStateService()
      const result = service.extractState('test')
      expect(result).toEqual('value')
    })

    it('should extract state from object initial state', () => {
      const initialState = {
        __SSR_STATE__: {
          test: 'value'
        }
      }
      globalThis.__INITIAL_STATE__ = initialState
      
      service = new SsrStateService()
      const result = service.extractState('test')
      expect(result).toEqual('value')
    })

    it('should handle invalid initial state', () => {
      globalThis.__INITIAL_STATE__ = 'invalid json'
      
      expect(() => new SsrStateService()).toThrow()
    })

    it('should handle missing initial state', () => {
      globalThis.__INITIAL_STATE__ = undefined
      service = new SsrStateService()
      expect(service.extractState('test')).toBeUndefined()
    })

    it('should handle non-object state key', () => {
      globalThis.__INITIAL_STATE__ = {
        __SSR_STATE__: 'not an object'
      }
      service = new SsrStateService()
      expect(service.extractState('test')).toBeUndefined()
    })
  })
})
