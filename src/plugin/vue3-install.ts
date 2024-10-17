import type { FunctionPlugin } from 'vue-demi'

import { DescriptorsContainer } from './descriptors-container'

export const vue3Install: FunctionPlugin = (app): void => {
  if (app.config.globalProperties.$dependencyContainer) {
    return
  }

  app.config.globalProperties.$dependencyContainer = new DescriptorsContainer()
}
