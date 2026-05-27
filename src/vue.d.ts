import type { DependencyContainer } from './types'
import type { DependencyContainerInternal } from './types'
import type { VueModelerDcOptions } from './plugin/vue-modeler-dc'

declare module 'vue/types/vue' {
  interface Vue {
    _vueModelerDc?: DependencyContainerInternal
    _vueModelerDcInstalled?: boolean
    readonly $vueModelerDc: DependencyContainer
  }
}

declare module 'vue/types/options' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ComponentOptions<V> {
    /**
     * Vue2 only: per-app configuration for vueModelerDc.
     */
    vueModelerDc?: VueModelerDcOptions
  }
}

export {}
