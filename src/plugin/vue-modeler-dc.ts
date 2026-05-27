import type { PluginFunction } from 'vue'
import type { Vue as VueInstance, VueConstructor } from 'vue/types/vue'

import { DescriptorContainer } from '../container/descriptor-container'

const mixinForVue2: {
  beforeCreate: (this: VueInstance) => void
} = {
  beforeCreate (this: VueInstance): void {
    this._vueModelerDc = this.$parent?._vueModelerDc ?? new DescriptorContainer()
  },
}

export const vueModelerDc: PluginFunction<void> = (
  VueCtor: VueConstructor,
): void => {
  const vuePrototype = VueCtor.prototype as VueInstance

  if (vuePrototype._vueModelerDcInstalled) {
    return
  }

  Object.defineProperty(
    vuePrototype,
    '_vueModelerDcInstalled',
    {
      value: true,
      writable: false,
    },
  )

  Object.defineProperty(
    vuePrototype,
    '$vueModelerDc',
    {
      get (this: VueInstance): DescriptorContainer {
        if (!this._vueModelerDc) {
          this._vueModelerDc = new DescriptorContainer()
        }

        return this._vueModelerDc
      },
    },
  )

  VueCtor.mixin(mixinForVue2)
}
