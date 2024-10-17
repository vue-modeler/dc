import { App, isVue3, Plugin } from 'vue-demi'

import { vue2Install } from './vue2-install'
import { vue3Install } from './vue3-install'


export const  vueModelerDcPlugin: Plugin = (app: App): void => {
  if (isVue3) {
    vue3Install(app)

    return 
  }

  vue2Install(app)
}

