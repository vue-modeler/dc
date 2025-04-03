import { provider } from '../provider'
import { SsrStateService } from './ssr-state-service'

export const useSsrState = provider (() => new SsrStateService())
