# Container resolution

> Draft for future README section. Describes how providers pick a container and which patterns are supported by the current public API.

## Public API summary

The current public surface is intentionally small:

- `provider(factory, options?)`
- `provider.redefine(factory)`
- `DependencyContainer.resolve(providerOrKey)`
- `DependencyContainer.size`

`DependencyContainer` is the public contract. Internal methods such as `get`, `delete`, or `register` belong to `DescriptorContainer` and must not be used as part of the documented API.

## Resolution order

When you call `useDependency()`, the library resolves the active container in this order:

1. **Active resolve context** — if code currently runs inside `container.resolve(useDependency)` or inside another provider that was resolved from that container, the same container is reused.
2. **Current Vue app** — otherwise the library falls back to `inject('vueModelerDc')` from the current Vue setup/inject context.

There is **no public `useDependency(customContainer)` overload anymore**. If you already have a container reference, use `container.resolve(useDependency)`.

## Factory signature

The factory receives an object, not the container directly:

```typescript
import { provider } from '@vue-modeler/dc'

const useApi = provider(({ dc }) => {
  return new ApiClient(dc)
})
```

`dc` is typed as the public `DependencyContainer` interface. Do not rely on internal `DescriptorContainer` methods in userland code.

## Use `dc` in factories, not `inject`

Inside a provider factory, always use the `dc` argument when you need the active container.

```typescript
const useApi = provider(({ dc }) => new ApiClient(dc))
```

### Do not use `inject('vueModelerDc')` in the factory

`inject('vueModelerDc')` only sees the current Vue app injection context. It does not follow an explicit `container.resolve(...)` chain.

```typescript
// Wrong — ignores the active resolve context
const useApi = provider(() => {
  const wrong = inject('vueModelerDc')
  return new ApiClient(wrong)
})

// Correct
const useApi = provider(({ dc }) => new ApiClient(dc))
```

## Nested providers

Nested calls inherit the same active container if they run synchronously during resolve.

```typescript
const useAuth = provider(() => new AuthService())
const useApi = provider(({ dc }) => new ApiClient(dc, useAuth()))
```

If you resolve `useApi` through `container.resolve(useApi)`, then `useAuth()` inside that factory resolves against the same `container` automatically.

## Where to call `useX()`

Composable-style providers should be called only:

- in component `setup`, synchronously; or
- inside another provider's factory during first resolve.

That is the supported path for scope-bound lifecycle.

### Factory runs in the descriptor instance scope

On first resolve, the factory runs inside the descriptor's own detached `effectScope`, not in the component setup scope.

```typescript
const useChild = provider(() => new Child())
const useParent = provider(({ dc }) => new Parent(dc, useChild()))
```

When `useChild()` is called synchronously inside the parent factory, its cleanup is attached to the parent's instance scope. This is expected and cascade cleanup still works when the parent descriptor is disposed.

## Runtime access outside setup

Do not call bare `useChild()` from instance methods, event handlers, `watch`, `nextTick`, or after `await`.

If you already have a container reference at runtime, use:

```typescript
const child = dc.resolve(useChild)
```

### Important lifecycle note for `resolve()`

`container.resolve(useX)` creates or returns the instance in that container, but it does **not** bind the instance to the caller's Vue scope.

If you pass a `symbol`, `resolve(symbol)` returns an already registered instance for that key and throws if no descriptor exists.

That means:

- `resolve()` is safe to call outside setup;
- non-persistent providers resolved this way stay in the container;
- with the current public API there is no public delete/dispose method, so such instances effectively live as long as the container itself.

In other words, `resolve()` behaves like a runtime get-or-create entrypoint, not like setup-bound automatic cleanup.

## Why bare runtime `useX()` is unsafe

For non-persistent providers, scope cleanup is registered only when there is an active Vue scope.

```typescript
dependencyDescriptor.subscribeOnParentScopeDispose(onScopeDispose)
onScopeDispose(() => {
  if (dependencyDescriptor.parentScopeCount > 0) return
  container.delete(providerKey)
})
```

If `useX()` runs outside setup and outside a supported synchronous resolve chain:

- there may be no active injected container context at all;
- there may be no active Vue scope for cleanup binding;
- or cleanup may bind to the wrong incidental scope.

Use `useX()` only in setup/factory code. Use `dc.resolve(useX)` for runtime access when you already hold a container reference.

## No async factories

Async factories are not supported. A dependency factory must:

- run to completion synchronously when first resolved;
- return the instance directly, never a `Promise`;
- avoid `async` / `await` in the factory body.

### Enforced by the library

| Layer | Behavior |
|-------|----------|
| **Types** | `DepFactory<Target>` uses `SyncTarget<Target>` so promise-like targets collapse to `never` |
| **Runtime** | If the factory returns a `Promise`, registration throws `Dependency factory must be synchronous and must not return a Promise` |

### Examples

```typescript
// OK
function async fetchModelData(dc) {
  const config = dc.resolve(useConfig)
  return fetch(config.url)
}

const useConfig = provider(() => {
  const vueApp = useVueApp()
  
})

const useModel = provider(({ dc }) => new MyModel({
  fetchData: () => fetchModelData(dc)
}))

// Not allowed — async keyword
const useModel = provider(async ({ dc }) => new MyModel(dc))

// Not allowed — returns Promise
const useModel = provider(({ dc }) => Promise.resolve(new MyModel(dc)))

// Not allowed — await inside factory
const useModel = provider(async ({ dc }) => {
  const config = await loadConfig()
  return new MyModel(dc, config)
})
```

Async work belongs on the created instance, not in the factory.

## Redefine and containers

`provider.redefine(factory)` swaps the factory for future resolves, but only if the target container does not already hold a live descriptor for that provider.

With the current API that means:

- `useX()` affects the plugin container of the current app;
- `dc.resolve(useX)` affects that explicit container;
- redefining after an instance already exists in the same container throws;
- redefining after the old descriptor was removed or when another container resolves first is allowed.

## Tests

For isolated tests, prefer resolving providers through a dedicated container rather than relying on the app container of the running component tree.

```typescript
const testApp = createApp({})
testApp.use(vueModelerDc)
const testContainer = testApp._context.provides.vueModelerDc as DependencyContainer

const api = testContainer.resolve(useApi)
```

Use `redefine()` together with a dedicated container to keep mocks isolated from other containers.
