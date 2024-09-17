import { DescriptorsContainer } from './plugin/descriptors-container'

export type DependencyFactory<Target> = (...args: any[]) => Target extends void ? never : Target

export interface Factory<Target> {
  (): Target
}

export type Provider<Target> = () => Target

export interface DependencyContainerPlugin {
  readonly dependencyContainer: DescriptorsContainer
}
