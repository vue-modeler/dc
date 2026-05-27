/** Dependency instance type; factories must not resolve to a Promise. */
type SyncTarget<Target> = Target extends Promise<unknown> ? never : Target

/** Synchronous factory: must return the instance directly, not a Promise. */
export type DepFactory<Target> = ({
  dc,
  prevFactory,
}: {
  dc: DependencyContainer
  prevFactory?: DepFactory<Target>
}) => SyncTarget<Target>

export interface Provider<Target> {
  (): Target
  __isProvider__: true
  redefine: (factory: DepFactory<Target>) => void
  readonly asKey: symbol
}

export interface DependencyContainer {
  resolve<Target> (key: symbol | Provider<Target>): Target
  get size (): number
}

export interface DependencyContainerPlugin {
  readonly dependencyContainer: DependencyContainer
}

export interface ProviderOptions {
  persistentInstance?: boolean
  key?: symbol  
}
