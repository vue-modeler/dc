export type JsonValue = 
  | string 
  | number
  | boolean
  | { [key: string]: JsonValue }
  | JsonValue[]
  | null

export type JsonObject = Record<string, JsonValue>

export type UtcIsoDateAndTime = string

export type UtcDateAndTime = Date

export interface SerializerResult<Value extends JsonValue = JsonValue> {
  extractionKey: string
  value: Value
  expiredAt?: UtcIsoDateAndTime
}

export interface SsrStateProvider {
  extractState: <Value extends JsonValue>(key: string) => SerializerResult<Value> | undefined
} 

export interface SsrStateSerializer {
  readonly isServer: boolean
  addSerializer: <Value extends JsonValue>(serializer: () => SerializerResult<Value>) => () => SerializerResult<Value>
  removeSerializer: (serializer: () => SerializerResult) => void
  serialize: () => Record<SerializerResult['extractionKey'], SerializerResult>
}

export type SerializedState = Record<SerializerResult['extractionKey'], SerializerResult>
