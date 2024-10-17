import { DescriptorsContainer } from './plugin/descriptors-container'

export type DependencyFactory<Target> = (...args: any[]) => Target

export type Provider<Target> = () => Target

export interface DependencyContainerPlugin {
  readonly dependencyContainer: DescriptorsContainer
}
