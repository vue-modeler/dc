import type { Vue as VueInstance } from 'vue/types/vue'

import { provider } from '../../provider/provider'

/**
 * Returns the root Vue instance bound to the current container.
 *
 * IMPORTANT: must be called only AFTER the plugin has bound the Vue app
 * (i.e. after the root `beforeCreate` mixin has run).
 */
export const useVueApp = provider<VueInstance>(({ dc }) => {
  const vueApp = dc.vueApp

  if (!vueApp) {
    throw new Error(
      'useVueApp: root Vue instance is not bound to the container (expected vueModelerDc beforeCreate mixin to run)',
    )
  }

  return vueApp
})
