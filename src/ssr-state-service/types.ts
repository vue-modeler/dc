export type JsonValue = 
  | string 
  | number
  | boolean
  | Record<string, JsonValue>
  | JsonValue[]
  | null

export type JsonObject = Record<string, JsonValue>

export type UtcIsoDateAndTime = string

export type UtcDateAndTime = Date

export interface SerializerResult<Value extends JsonValue> {
  extractionKey: string
  value: Value
}

export interface SsrStateProvider {
  extractState: (key: string) => unknown
} 

export interface SsrStateSerializer {
  readonly isServer: boolean
  addSerializer: <Value extends JsonValue>(serializer: () => SerializerResult<Value>) => () => SerializerResult<Value>
  removeSerializer: (serializer: () => SerializerResult<JsonValue>) => void
  injectState: (state: Record<string, unknown>) => void
}     

export type SerializedState = Record<string, unknown>
