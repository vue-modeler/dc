import { DescriptorsContainer } from './plugin/descriptors-container'

export type DependencyFactory<Target> = (...args: any[]) => Target

export interface Provider<Target> {
  (): Target
  readonly asKey: symbol
}
  

export interface DependencyContainerPlugin {
  readonly dependencyContainer: DescriptorsContainer
}

export interface ProviderOptions {
  persistentInstance?: boolean
  key?: symbol
}
