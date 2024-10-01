
import { DescriptorsContainer } from './plugin/descriptors-container'

declare module 'vue-demi' {
        interface ComponentCustomProperties {
            $dependencyContainer?: DescriptorsContainer
        }
    }
