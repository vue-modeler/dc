import { inject } from 'vue'

import { DescriptorContainer } from './descriptor-container'


const containerStack: DescriptorContainer[] = []

export function pushContainer (container: DescriptorContainer): void {
  if (containerStack.length > 0 && containerStack.at(-1) === container) {
    return
  }

  containerStack.push(container)
}

export function getContainer (): DescriptorContainer {
  return containerStack.at(-1) ?? getContainerFromCurrentVueApp()
}

export function popContainer (): void {
  if (containerStack.length === 0) {
    throw new Error('Container stack is empty')
  }

  containerStack.pop()
}


export function getContainerFromCurrentVueApp (): DescriptorContainer {
  const container = inject<DescriptorContainer>('vueModelerDc')
  
  if (!container) {
    throw new Error('Vue Modeler DC plugin not installed')
  }
  
  return container
}

