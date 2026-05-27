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


export interface DependencyDescriptor<Target> {
  readonly factory: unknown
  readonly instance: Target
  readonly parentScopeCount: number
  subscribeOnParentScopeDispose: (onParentScopeDispose: (fn: () => void) => void) => void
  /** Disposes instance when descriptor is replaced after redefine. */
  disposeForReplace: () => void
}

export interface DependencyContainer {
  resolve<Target> (key: symbol | Provider<Target>): Target
  get size (): number
}

/**
 * Internal container API required by this package runtime (`provider()` uses get/register/delete).
 *
 * Public consumers should rely on the minimal `DependencyContainer` contract.
 */
export interface DependencyContainerInternal extends DependencyContainer {
  delete<Target> (key: symbol | Provider<Target>): boolean
  get<Target> (key: symbol | Provider<Target>): DependencyDescriptor<Target> | undefined
  register<Target> (
    key: symbol | Provider<Target>,
    factory: DepFactory<Target>,
  ): DependencyDescriptor<Target>
}

export interface DependencyContainerPlugin {
  readonly dependencyContainer: DependencyContainer
}

export interface ProviderOptions {
  persistentInstance?: boolean
  key?: symbol  
}
