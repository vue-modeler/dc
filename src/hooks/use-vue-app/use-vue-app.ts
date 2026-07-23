import type { VueApp } from '../../vue-app'

import { provider } from '../../provider/provider'

/**
 * Returns the root Vue app bound to the current container.
 *
 * IMPORTANT: must be called only AFTER the plugin has bound the Vue app
 * (i.e. after `app.use(vueModelerDc)`).
 */
export const useVueApp = provider<VueApp>(({ dc }) => {
  const vueApp = dc.vueApp

  if (!vueApp) {
    throw new Error(
      'useVueApp: root Vue app is not bound to the container (expected app.use(vueModelerDc) to run)',
    )
  }

  return vueApp
})
