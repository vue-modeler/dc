import { getCurrentInstance } from 'vue'

import { DescriptorsContainer } from './plugin/descriptors-container'

export function getContainer (): DescriptorsContainer {
  const currentInstance = getCurrentInstance()?.proxy
  const container = currentInstance?.$dependencyContainer

  if (!container) {
    throw new Error('Dependency container undefined. Check plugin setup')
  }

  return container
}
