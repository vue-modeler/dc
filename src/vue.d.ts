import type { DescriptorContainer } from './container/descriptor-container'
import type { DependencyContainer } from './types'

declare module 'vue/types/vue' {
  interface Vue {
    _vueModelerDc?: DescriptorContainer
    _vueModelerDcInstalled?: boolean
    readonly $vueModelerDc: DependencyContainer
  }
}

export {}
