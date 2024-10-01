import Vue from 'vue'
import { DescriptorsContainer } from './descriptors-container'

export function vue3Install (app: Vue.App): void {
  if (app.config.globalProperties.$dependencyContainer) {
    return
  }

  app.config.globalProperties.$dependencyContainer = new DescriptorsContainer()
}
