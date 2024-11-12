
import { DescriptorsContainer } from './plugin/descriptors-container'

declare module 'vue' {
  interface ComponentCustomProperties {
    readonly $vueModelerDc?: DescriptorsContainer
  }
}

declare module 'vue/types/vue' {
  interface Vue {
    /**
     * Currently installed container instance.
     */
    readonly $vueModelerDc?: DescriptorsContainer
    _vueModelerDc: DescriptorsContainer
  }
}

// normally this is only needed in .d.ts files
export {}
