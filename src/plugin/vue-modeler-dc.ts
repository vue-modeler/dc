import type { VueApp } from '../vue-app'

import { Container } from '../container/container'
import { isInternalDependencyContainer } from '../container/is-internal-dependency-container'
import type { DependencyContainerInternal } from '../types'

export const VUE_MODELER_DC_KEY = 'vueModelerDc'

export interface VueModelerDcOptions {
  /**
   * Provide a pre-created container instance to be used by this app.
   *
   * Passed via `app.use(vueModelerDc, { dc })`.
   */
  dc?: DependencyContainerInternal
}

const installedApps = new WeakSet<VueApp>()

export const vueModelerDc = {
  install (app: VueApp, options: VueModelerDcOptions = {}): void {
    if (installedApps.has(app)) {
      return
    }

    const instanceDc = options.dc

    if (instanceDc && !isInternalDependencyContainer(instanceDc)) {
      throw new Error(
        'Invalid `vueModelerDc.dc` option: expected a container compatible with internal container API',
      )
    }

    const dc: DependencyContainerInternal = instanceDc ?? new Container()
    dc.bindVueApp(app)

    app.provide(VUE_MODELER_DC_KEY, dc)
    app.config.globalProperties.$vueModelerDc = dc
    
    installedApps.add(app)
  },
}
