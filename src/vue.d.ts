
import { DescriptorsContainer } from './plugin/descriptors-container'

declare module 'vue' {
  interface ComponentCustomProperties {
    readonly $vueModelerDc: DescriptorsContainer
  }
}

// normally this is only needed in .d.ts files
export {}
