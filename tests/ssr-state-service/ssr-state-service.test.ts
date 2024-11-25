import { describe, expect, it, beforeEach } from 'vitest'
import { JsonValue, SerializerResult } from '../../src/ssr-state-service/types'
import { SsrStateService } from '../../src/ssr-state-service/ssr-state-service'

class TestSsrStateService extends SsrStateService {
  get _stateFromServer() {
    return this.stateFromServer
  }

  get _serializers() {
    return this.serializers
  }

  set _isServer(value: boolean) {
    Object.defineProperty(this, 'isServer', { value })
  }
}

describe('SsrStateService', () => {
  let service: TestSsrStateService

  const createTestResult = (key: string, value: JsonValue): SerializerResult => ({
    extractionKey: key,
    value
  })

  beforeEach(() => {
    service = new TestSsrStateService({})
  })

  describe('constructor', () => {
    it('should initialize with empty state when empty object provided', () => {
      expect(service._stateFromServer).toEqual({})
    })

    it('should use provided state', () => {
      const initialState = {
        test: createTestResult('test', 'value')
      }
      service = new TestSsrStateService(initialState)
      expect(service._stateFromServer).toEqual(initialState)
    })

    it('should set isServer based on window availability', () => {
      expect(service.isServer).toBe(typeof window === 'undefined')
    })
  })

  describe('extractState', () => {
    it('should return undefined for non-existent key', () => {
      expect(service.extractState('nonexistent')).toBeUndefined()
    })

    it('should return state for existing key', () => {
      const state = createTestResult('test', 'value')
      service = new TestSsrStateService({ test: state })
      expect(service.extractState('test')).toEqual(state)
    })
  })

  describe('serializers', () => {
    const mockSerializer = () => createTestResult('test', 'value')

    describe('on server', () => {
      beforeEach(() => {
        service._isServer = true
      })

      it('should add serializer and return the serializer function', () => {
        const returned = service.addSerializer(mockSerializer)
        expect(returned).toBe(mockSerializer)
        expect(service._serializers.size).toBe(1)
      })

      it('should remove serializer and return true if exists', () => {
        service.addSerializer(mockSerializer)
        const result = service.removeSerializer(mockSerializer)
        expect(result).toBe(true)
        expect(service._serializers.size).toBe(0)
      })

      it('should return false when removing non-existing serializer', () => {
        const result = service.removeSerializer(mockSerializer)
        expect(result).toBe(false)
      })

      it('should serialize all registered serializers', () => {
        const serializer1 = () => createTestResult('test1', 'value1')
        const serializer2 = () => createTestResult('test2', 'value2')

        service.addSerializer(serializer1)
        service.addSerializer(serializer2)

        const serialized = service.serialize()
        expect(serialized).toEqual({
          test1: createTestResult('test1', 'value1'),
          test2: createTestResult('test2', 'value2')
        })
      })
    })

    describe('on client', () => {
      beforeEach(() => {
        service._isServer = false
      })

      it('should not add serializer and return the serializer function', () => {
        const result = service.addSerializer(mockSerializer)
        expect(result).toBe(mockSerializer)
        expect(service._serializers.size).toBe(0)
      })

      it('should return false when removing serializer', () => {
        const result = service.removeSerializer(mockSerializer)
        expect(result).toBe(false)
      })

      it('should always serialize to empty state', () => {
        service.addSerializer(mockSerializer) // Should not actually add
        const result = service.serialize()
        expect(result).toEqual({})
      })
    })
  })
})