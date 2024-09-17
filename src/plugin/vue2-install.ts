import { DescriptorsContainer } from './descriptors-container'

const mixinForVue2 = {
  beforeCreate (): void {
    this.$dependencyContainer = this.$options.parent?.$dependencyContainer || this.$options.dependencyContainer

    if (this.$dependencyContainer) {
      return
    }

    this.$dependencyContainer = new DescriptorsContainer()
  },
}


export function vue2Install (vue): void {
  if (vue.prototype._dependencyContainerIntalled) {
    return
  }

  vue.prototype._dependencyContainerIntalled = true
  vue.mixin(mixinForVue2)
}
