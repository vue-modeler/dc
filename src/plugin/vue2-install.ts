import type {  ComponentPublicInstance, FunctionPlugin } from 'vue-demi'
import { DescriptorsContainer } from './descriptors-container'
 
const mixinForVue2: ThisType<ComponentPublicInstance>  = {
  beforeCreate (): void {
    this.$dependencyContainer = this.$parent?.$dependencyContainer ?? new DescriptorsContainer()
  },
}


export const  vue2Install: FunctionPlugin = (_vue): void => {
  _vue.mixin(mixinForVue2)
}
