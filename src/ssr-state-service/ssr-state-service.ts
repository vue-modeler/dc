import { JsonValue, SerializedState, SerializerResult, SsrStateProvider, SsrStateSerializer } from './types'
  
declare global {
  // eslint-disable-next-line no-var
  var __INITIAL_STATE__: string | object | undefined
}

export class SsrStateService implements SsrStateSerializer, SsrStateProvider {
  readonly isServer: boolean = true
  readonly stateKey: string = '__SSR_STATE__'
  protected serializers = new Set<() => SerializerResult<JsonValue>>()
  protected stateFromServer: SerializedState = {}
  
  constructor () {
    this.isServer = typeof window === 'undefined'

    this.initStateFromServer()
  }

  protected initStateFromServer (): void {
    if (this.isServer) {
      return
    }
    if (!globalThis.__INITIAL_STATE__) {
      return
    }

    const initialState = (typeof globalThis.__INITIAL_STATE__ === 'string' 
      ? JSON.parse(globalThis.__INITIAL_STATE__) 
      : globalThis.__INITIAL_STATE__) as Record<string, unknown>
    
    if (typeof initialState[this.stateKey] !== 'object') {
      return
    }

    this.stateFromServer = initialState[this.stateKey] as SerializedState
  }
    
  extractState (key: string): unknown {
    return this.stateFromServer[key]
  }

  addSerializer<Value extends JsonValue> (serializer: () => SerializerResult<Value>): () => SerializerResult<Value> {
    if (this.isServer) {
      this.serializers.add(serializer)
    }

    return serializer
  }

  removeSerializer (serializer: () => SerializerResult<JsonValue>): boolean {
    if (this.isServer) {
      return this.serializers.delete(serializer)
    }

    return false
  }

  protected serialize (): SerializedState {
    const state: SerializedState = {}
    for (const serializer of this.serializers) {
      const result = serializer()
      if (result.value === undefined) {
        continue
      }

      state[result.extractionKey] = result.value
    }

    return state
  }

  injectState (state: Record<string, unknown>): void {
    if (!this.isServer) { 
      return
    }

    state[this.stateKey] = this.serialize()
  }
}

