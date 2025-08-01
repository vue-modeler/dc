import { inject } from 'vue'

import { DescriptorsContainer } from './plugin/descriptors-container'

export function getContainer(): DescriptorsContainer {
  const container = inject<DescriptorsContainer>('vueModelerDc')
  
  if (!container) {
    throw new Error('Vue Modeler DC plugin not installed')
  }
  
  return container
}
