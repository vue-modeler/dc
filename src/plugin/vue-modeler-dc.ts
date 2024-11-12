import { PluginFunction } from 'vue'
import Vue from 'vue'

import { DescriptorsContainer } from './descriptors-container'

const mixinForVue2: ThisType<Vue> = {
  beforeCreate (): void {
    this._vueModelerDc = this.$parent?._vueModelerDc ?? new DescriptorsContainer()
  },
}

export const vueModelerDc: PluginFunction<void> = (_Vue): void => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if ('_vueModelerDcInstalled' in _Vue.prototype && _Vue.prototype._vueModelerDcInstalled) {
    return
  }
  
  Object.defineProperty(
    _Vue.prototype,
    '_vueModelerDcInstalled', 
    {
      value: true,
      writable: false,
    },
  )
  
  Object.defineProperty(
    _Vue.prototype,
    '$vueModelerDc', 
    {
      get () {
        return (this as Vue)._vueModelerDc;
      },
    },
  )

  _Vue.mixin(mixinForVue2)
}
