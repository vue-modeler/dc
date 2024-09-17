
import { DescriptorsContainer } from './plugin/descriptors-container'
import { DependencyContainerPlugin } from './types'

declare module 'vue/types/vue' {
    // Global properties can be declared
    // on the `VueConstructor` interface
    interface Vue {
        $dependencyContainer: DescriptorsContainer
    }

    interface VueConstructor {
        $dependencyContainer: DescriptorsContainer
    }
}

// ComponentOptions is declared in types/options.d.ts
declare module 'vue/types/options' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ComponentOptions<V extends Vue> {
        dependencyContainer?: DependencyContainerPlugin
    }
}
