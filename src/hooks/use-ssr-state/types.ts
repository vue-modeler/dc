export type UtcIsoDateAndTime = string

export type UtcDateAndTime = Date

export interface SerializerResult<Value> {
  extractionKey: string
  value: Value
}

export interface SsrStateProvider {
  extractState: (key: string) => unknown
} 

export interface SsrStateSerializer {
  readonly isServer: boolean
  addSerializer: <Value>(serializer: () => SerializerResult<Value>) => () => SerializerResult<Value>
  removeSerializer: (serializer: () => SerializerResult<unknown>) => void
  injectState: (state: Record<string, unknown>) => void
}     

export type SerializedState = Record<string, unknown>
