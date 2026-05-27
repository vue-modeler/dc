import { getCurrentInstance } from 'vue'

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
  const currentInstance = getCurrentInstance()?.proxy as
    | (Record<string, unknown> & { $vueModelerDc?: DescriptorContainer })
    | undefined

  const fromInstance = currentInstance?.$vueModelerDc
  if (fromInstance) {
    return fromInstance
  }

  throw new Error('Vue Modeler DC plugin not installed')
}

