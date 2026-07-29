# Design: Scope-bound `resolve()` via custom EffectScope

**Date:** 2026-07-29  
**Status:** Approved for implementation planning  
**Package:** `@vue-modeler/di`

## Problem

`container.resolve(providerOrKey)` is safe to call outside Vue setup, but it does not bind disposal to any scope. On the client, `provider()` only registers `onScopeDispose` cleanup when `getCurrentScope()` is defined:

```ts
if (getCurrentScope() === undefined) {
  return dependencyDescriptor.instance
}
```

So instances created via `resolve()` outside setup stay in the container until the container itself is gone. Callers need a way to create an instance at runtime and dispose it later, without changing how `provider()` decides cleanup.

Additionally, `resolve()` short-circuits when a descriptor already exists and returns `depDescriptor.instance` without calling the provider. That blocks scope-binding for already-created instances and also returns instances for raw symbols that are not owned by any provider.

## Goals

1. Allow callers to pass a custom Vue `EffectScope` into `resolve()` so disposal can be triggered later via `scope.stop()`.
2. Keep `provider()` behavior unchanged: it still uses `getCurrentScope()` / `onScopeDispose`; it does not care which scope is current.
3. Always resolve through a provider function (provider object or alias key), never by returning a cached descriptor for an orphan symbol.
4. Export a helper to create a detached scope for this use case.

## Non-goals

- Changing bare `useX()` setup lifecycle.
- Adding a public container `dispose()` / `delete()` API.
- Changing SSR behavior (`IS_SERVER_SIDE` still skips scope disposal wiring).
- Changing `persistentInstance` semantics (persistent providers still skip cleanup wiring even when a scope is active).

## Approach

Use a real Vue detached `EffectScope` (`effectScope(true)`). When `resolve(keyOrProvider, scope)` receives a scope, run the provider inside `scope.run(...)` so `getCurrentScope()` is that scope. Existing `provider()` cleanup registration then attaches to it.

Do not invent a parallel scope abstraction or patch Vue APIs.

## Public API

### `createScope()`

New export, e.g. `src/scope/create-scope.ts`:

```ts
import { effectScope, type EffectScope } from 'vue'

export function createScope (): EffectScope {
  return effectScope(true)
}
```

Re-export from package entry.

### `DependencyContainer.resolve`

```ts
resolve<Target>(
  keyOrProvider: symbol | Provider<Target>,
  scope?: EffectScope,
): Target
```

- `scope` is optional for backward compatibility when omitted.
- When provided, it is the disposal owner for this resolve call (subject to `persistentInstance` / SSR rules inside `provider()`).

### Usage

```ts
import { createScope } from '@vue-modeler/di'

const scope = createScope()
const instance = dc.resolve(useMyService, scope)

// later
scope.stop() // triggers onScopeDispose → descriptor dispose / container delete
```

Callers may also pass any detached `EffectScope` they already hold; `createScope()` is the recommended helper.

## Runtime behavior

### Provider key ownership (`asKey` in alias map)

Today `resolve(provider.asKey)` can succeed only because of the descriptor short-circuit: the map is keyed by `asKey`, but `asKey` is **not** registered in `provider-aliases` unless the caller also used `assignKey`. After removing the short-circuit, `getProviderByAliasKey(asKey)` would return `undefined` and throw.

**Required companion change:** when creating a provider, register its own `asKey` in the alias map (same mechanism as `assignKey`), so every provider-owned key resolves to the provider function:

- default `asKey` → provider
- each `assignKey(...)` symbol → provider

Then `resolve(symbol)` works iff the symbol belongs to a provider; orphan symbols always throw.

### `Container.resolve`

1. Resolve the provider function:
   - If `keyOrProvider` is a `Provider`, use it.
   - If it is a `symbol`, look up via `getProviderByAliasKey(key)` (covers `asKey` and aliases after the registration change above).
2. If no provider is found, throw (e.g. existing message: `Dependency descriptor not found for symbol key`).
3. `pushContainer(this)`, then:
   - If `scope` is provided: `scope.run(() => provider())`.
   - Else: `provider()`.
4. `popContainer()` in `finally`.

**Remove** the early return that returns `depDescriptor.instance` when a descriptor already exists. Caching and reuse stay inside `provider()` via `dc.get` / `dc.register`.

Consequences:

- `resolve(provider)` / `resolve(asKey)` / `resolve(aliasKey)` always go through `provider()`, so an optional scope can bind disposal even if the instance already exists.
- `resolve(rawSymbol)` where the symbol is not a provider `asKey` or alias throws, even if some internal `register(symbol, factory)` left a descriptor in the map. That is intentional: every resolvable key must belong to a provider.

### `provider()`

No behavioral changes. Existing paths remain:

- SSR: return instance, no dispose wiring.
- No current scope: return instance, no dispose wiring.
- `persistentInstance`: return instance, no dispose wiring.
- Otherwise: `subscribeOnParentScopeDispose(onScopeDispose)` + delete descriptor when last parent scope stops.

Passing a scope into `resolve()` only makes `getCurrentScope()` non-`undefined` during the call.

### Shared instances across scopes

If the same non-persistent provider is used from multiple scopes (component scopes and/or custom scopes), existing `parentScopeCount` semantics apply: the instance is disposed when the last subscribed parent scope stops. No special case for custom scopes.

## Error handling

| Case | Behavior |
|------|----------|
| Symbol with no provider alias / ownership | Throw |
| Provider factory returns Promise / falsy | Existing Descriptor errors |
| Cyclic construction | Existing cyclic error |
| `scope` + `persistentInstance` | No throw; `scope.stop()` does not remove the persistent instance (document this) |
| `scope` omitted | Same as today after removing short-circuit: create/reuse via `provider()`, no cleanup if no current Vue scope |

## Testing

Add / update tests for:

1. `createScope()` returns a stopped-able detached scope.
2. `resolve(provider, scope)` wires disposal; `scope.stop()` deletes the descriptor and stops the instance scope / destructor when it was the last parent.
3. `resolve(provider, scope)` on an already-existing descriptor still wires the new scope (no short-circuit).
4. Two scopes sharing one provider: first stop keeps instance; second stop removes it.
5. `resolve(unknownSymbol)` throws even if a descriptor was registered under that symbol internally.
6. `resolve(provider.asKey)` works after registering default `asKey` in the alias map (with and without an existing descriptor).
7. Existing nested-provider / alias-key resolve tests still pass with the always-call-provider path.
8. Update the test that currently expects `register(symbol)` + `resolve(symbol)` to return the instance — either remove it or change it to expect a throw / use a real provider.

## Docs

Update `docs/container-resolution.md`:

- Document `createScope()` and `resolve(provider, scope)`.
- Replace the note that `resolve()` never binds to a caller scope with: without `scope`, no binding; with `scope`, binds like setup.
- Note that `resolve` requires a provider or provider-owned key.
- Note persistent + scope = no cleanup.

## Files to touch

| File | Change |
|------|--------|
| `src/scope/create-scope.ts` | New: `createScope()` |
| `src/index.ts` | Export `createScope` |
| `src/types.ts` | Optional `scope?: EffectScope` on `resolve` |
| `src/provider/provider.ts` | Register default `asKey` in the alias map at creation |
| `src/container/container.ts` | Remove descriptor short-circuit; optional `scope.run` |
| `docs/container-resolution.md` | Lifecycle + API notes |
| `tests/container/container.test.ts` | Short-circuit / raw symbol behavior |
| `tests/provider/provider.test.ts` (or new scope tests) | Scope-bound resolve + disposal; `resolve(asKey)` |
| README (optional brief mention) | Point to guide / example |

## Out of scope for this change

- Making `scope` required on `resolve` (kept optional for compatibility).
- Warning when scope is passed to a persistent provider.
- New disposal API on the container itself.
