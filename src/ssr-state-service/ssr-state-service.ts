import { JsonValue, SerializerResult, SsrStateProvider, SerializedState, SsrStateSerializer } from './types'
  
export class SsrStateService implements SsrStateSerializer, SsrStateProvider {
  readonly isServer: boolean = true
  protected serializers = new Set<() => SerializerResult>()
  
  constructor (
    protected stateFromServer: SerializedState = {},
  ) {
    this.isServer = typeof window === 'undefined'

    this.stateFromServer = stateFromServer
  }
    
  extractState<Value extends JsonValue> (key: string): SerializerResult<Value> | undefined {
    return this.stateFromServer[key] as unknown as SerializerResult<Value> | undefined
  }

  addSerializer<Value extends JsonValue = JsonValue> (serializer: () => SerializerResult<Value>): () => SerializerResult<Value> {
    if (this.isServer) {
      this.serializers.add(serializer)
    }

    return serializer
  }

  removeSerializer (serializer: () => SerializerResult): boolean {
    if (this.isServer) {
      return this.serializers.delete(serializer)
    }

    return false
  }

  serialize (): SerializedState {
    const state: SerializedState = {}
    for (const serializer of this.serializers) {
      const result = serializer()
      state[result.extractionKey] = result
    }

    return state
  }
}

