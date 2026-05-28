import type { PluginFunction } from 'vue'
import type { Vue as VueInstance, VueConstructor } from 'vue/types/vue'

import { Container } from '../container/container'
import { isInternalDependencyContainer } from '../container/is-internal-dependency-container'
import type { DependencyContainer, DependencyContainerInternal } from '../types'

export interface VueModelerDcOptions {
  /**
   * Provide a pre-created container instance to be used by this app root (and inherited by children).
   *
   * Vue2 only: passed via `new Vue({ vueModelerDc: { dc } })`.
   */
  dc?: DependencyContainerInternal
}

export const vueModelerDc: PluginFunction<unknown> = (
  VueCtor: VueConstructor,
): void => {
  const vuePrototype = VueCtor.prototype as VueInstance

  if (vuePrototype._vueModelerDcInstalled) {
    return
  }

  const mixinForVue2 = {
    beforeCreate (this: VueInstance): void {
      if (this._vueModelerDc) {
        return
      }

      if (this.$parent?._vueModelerDc) {
        this._vueModelerDc = this.$parent._vueModelerDc
        return  
      }

      const instanceDc = (this.$options as unknown as { vueModelerDc?: VueModelerDcOptions })
        .vueModelerDc
        ?.dc

      if (instanceDc && !isInternalDependencyContainer(instanceDc)) {
        throw new Error(
          'Invalid `vueModelerDc.dc` option: expected a container compatible with internal container API',
        )
      }

      this._vueModelerDc = instanceDc ?? new Container()
      this._vueModelerDc.bindVueApp(this)
    },
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
      get (this: VueInstance): DependencyContainer {
        if (!this._vueModelerDc) {
          throw new Error(
            'vueModelerDc: container is not initialized (expected vueModelerDc beforeCreate mixin to run and set `_vueModelerDc`)',
          )
        }

        return this._vueModelerDc
      },
    },
  )

  VueCtor.mixin(mixinForVue2)
}
