import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SsrStateService } from '../../src/ssr-state-service/ssr-state-service'

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

    it('should serialize state from all serializers', () => {
      const serializer1 = () => ({ extractionKey: 'test1', value: 'value1' })
      const serializer2 = () => ({ extractionKey: 'test2', value: 'value2' })
      
      service.addSerializer(serializer1)
      service.addSerializer(serializer2)

      const state = {}
      const result = service.injectState(state)
      
      expect(result[service.stateKey]).toEqual({
        test1: 'value1',
        test2: 'value2'
      })
    })
  })

  describe('on client', () => {
    beforeEach(() => {
      vi.spyOn(global, 'window', 'get').mockReturnValue({} as Window & typeof globalThis)
      service = new SsrStateService()
    })

    it('should not add or remove serializers', () => {
      const serializer = () => ({ extractionKey: 'test', value: 'value' })
      service.addSerializer(serializer)
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
      
      expect(() => {
        service = new SsrStateService()
      }).toThrow()
      
      expect(service.extractState('test')).toBeUndefined()
    })

    it('should not modify state on inject', () => {
      const state = { existing: 'value' }
      const result = service.injectState(state)
      expect(result).toEqual(state)
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