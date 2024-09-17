
import { DescriptorsContainer } from './src/plugin/descriptors-container'
import { DependencyContainerPlugin } from './src/types'

declare module 'vue/types/vue' {
  // Global properties can be declared
  // on the `VueConstructor` interface
  interface Vue {
    $scopedDc: DescriptorsContainer
  }

  interface VueConstructor {
    $scopedDc: DescriptorsContainer
  }
}

// ComponentOptions is declared in types/options.d.ts
declare module 'vue/types/options' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ComponentOptions<V extends Vue> {
    scopedDc?: DependencyContainerPlugin
  }
}
