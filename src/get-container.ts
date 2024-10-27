import { getCurrentInstance } from 'vue'

import { DescriptorsContainer } from './plugin/descriptors-container'

export function getContainer (): DescriptorsContainer {
  
  const currentInstance = getCurrentInstance()?.proxy
  
  if (!currentInstance) {
    throw new Error('Current instance is undefined')
  }
  
  if (!currentInstance.$vueModelerDc) {
    throw new Error('Dependency container undefined. Check plugin setup')
  }

  return currentInstance.$vueModelerDc
}
