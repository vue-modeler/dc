import type { App } from 'vue'

import { DescriptorsContainer } from './descriptors-container'

export const vueModelerDc = {
  install(app: App): void {
    app.provide('vueModelerDc', new DescriptorsContainer())
  }
}
