import Vue from 'vue'

import { vue2Install } from './vue2-install'
import { vue3Install } from './vue3-install'


export function dependencyContainerPlugin (app: typeof Vue): void {
  if (app.version[0] === '3') {
    vue3Install(app)

    return 
  }

  vue2Install(app)
}

