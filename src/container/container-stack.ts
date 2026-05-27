import { getCurrentInstance } from 'vue'

import type { DependencyContainerInternal } from '../types'


const containerStack: DependencyContainerInternal[] = []

export function pushContainer (container: DependencyContainerInternal): void {
  if (containerStack.length > 0 && containerStack.at(-1) === container) {
    return
  }

  containerStack.push(container)
}

export function getContainer (): DependencyContainerInternal {
  return containerStack.at(-1) ?? getContainerFromCurrentVueApp()
}

export function popContainer (): void {
  if (containerStack.length === 0) {
    throw new Error('Container stack is empty')
  }

  containerStack.pop()
}


export function getContainerFromCurrentVueApp (): DependencyContainerInternal {
  const currentInstance = getCurrentInstance()?.proxy as
    | (Record<string, unknown> & { $vueModelerDc?: DependencyContainerInternal })
    | undefined

  const fromInstance = currentInstance?.$vueModelerDc
  if (fromInstance) {
    return fromInstance
  }

  throw new Error('Vue Modeler DC plugin not installed')
}

