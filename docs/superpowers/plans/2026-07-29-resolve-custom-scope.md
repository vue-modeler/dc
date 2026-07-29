# Scope-bound `resolve()` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let callers pass a Vue `EffectScope` into `container.resolve()` so instances created outside setup can be disposed later via `scope.stop()`, without changing `provider()` cleanup logic.

**Architecture:** Export `createScope()` as a thin `effectScope(true)` helper. Register each provider's default `asKey` in the alias map at creation. Remove `resolve()`'s descriptor short-circuit so resolution always goes through the provider function; when a scope is passed, invoke the provider inside `scope.run(...)`.

**Tech Stack:** TypeScript, Vue 2.7 (`effectScope` / `EffectScope`), Vitest, pnpm.

## Global Constraints

- Do not change `provider()` disposal decision paths (SSR / no-scope / `persistentInstance` / `onScopeDispose` wiring).
- Keep `resolve(keyOrProvider)` without scope backward-compatible for provider objects and provider-owned keys.
- Orphan symbols (not a provider `asKey` or `assignKey` alias) must throw from `resolve`, even if an internal descriptor exists under that symbol.
- `scope` on `resolve` stays optional; do not warn on persistent + scope.
- Follow existing test style (vitest + vue mocks where already used).
- Prefer small focused commits per task.

---

## File map

| File | Responsibility |
|------|----------------|
| `src/scope/create-scope.ts` | Public helper returning a detached Vue `EffectScope` |
| `src/index.ts` | Re-export `createScope` |
| `src/types.ts` | Public `resolve` signature includes optional `scope?: EffectScope` |
| `src/provider/provider.ts` | Register default `asKey` into alias map at provider creation |
| `src/container/container.ts` | Always resolve via provider; optional `scope.run` |
| `tests/scope/create-scope.test.ts` | `createScope` behavior |
| `tests/provider/provider-aliases.test.ts` | Default `asKey` alias registration |
| `tests/container/container.test.ts` | Resolve-through-provider / orphan symbol / scope wiring |
| `tests/provider/provider.test.ts` | Scope-bound resolve disposal cases (or extend container tests) |
| `docs/container-resolution.md` | Document new lifecycle API |

---

### Task 1: `createScope()` helper

**Files:**
- Create: `src/scope/create-scope.ts`
- Modify: `src/index.ts`
- Test: `tests/scope/create-scope.test.ts`

**Interfaces:**
- Consumes: Vue `effectScope`
- Produces: `createScope(): EffectScope` (detached, `effectScope(true)`)

- [ ] **Step 1: Write the failing test**

Create `tests/scope/create-scope.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { getCurrentScope, onScopeDispose } from 'vue'

import { createScope } from '../../src/scope/create-scope'

describe('createScope', () => {
  it('returns a detached EffectScope that can register dispose and stop', () => {
    const dispose = vi.fn()
    const scope = createScope()

    expect(getCurrentScope()).toBeUndefined()

    scope.run(() => {
      expect(getCurrentScope()).toBe(scope)
      onScopeDispose(dispose)
    })

    expect(dispose).not.toHaveBeenCalled()
    scope.stop()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/scope/create-scope.test.ts`

Expected: FAIL (module not found / `createScope` not defined)

- [ ] **Step 3: Write minimal implementation**

Create `src/scope/create-scope.ts`:

```ts
import { EffectScope, effectScope } from 'vue'

export function createScope (): EffectScope {
  return effectScope(true)
}
```

Add to `src/index.ts` (with other exports):

```ts
export * from './scope/create-scope'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/scope/create-scope.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scope/create-scope.ts src/index.ts tests/scope/create-scope.test.ts
git commit -m "$(cat <<'EOF'
feat: export createScope helper for detached EffectScope

EOF
)"
```

---

### Task 2: Register provider default `asKey` in alias map

**Files:**
- Modify: `src/provider/provider.ts`
- Test: `tests/provider/provider-aliases.test.ts`

**Interfaces:**
- Consumes: `registerProviderAlias(keys: symbol[], provider: Provider<Target>): void`
- Produces: after `provider(...)`, `getProviderByAliasKey(provider.asKey) === provider`

- [ ] **Step 1: Write the failing test**

Add to `tests/provider/provider-aliases.test.ts` inside `describe('registerProviderAlias / getProviderByAliasKey', ...)` (or a new nested describe):

```ts
it('registers the provider default asKey in the alias map at creation', () => {
  const useDependency = provider(() => 'value')

  expect(getProviderByAliasKey(useDependency.asKey)).toBe(useDependency)
})

it('registers a custom options.key in the alias map at creation', () => {
  const key = Symbol('custom')
  const useDependency = provider(() => 'value', { key })

  expect(useDependency.asKey).toBe(key)
  expect(getProviderByAliasKey(key)).toBe(useDependency)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/provider/provider-aliases.test.ts -t "registers the provider default asKey"`

Expected: FAIL — `getProviderByAliasKey(useDependency.asKey)` is `undefined`

- [ ] **Step 3: Write minimal implementation**

In `src/provider/provider.ts`, after `Object.defineProperties(provider, { ... })` and before `return provider`, register the default key:

```ts
registerProviderAlias([providerKey], provider)

return provider
```

`registerProviderAlias` is already imported in this file.

- [ ] **Step 4: Run alias tests**

Run: `pnpm exec vitest run tests/provider/provider-aliases.test.ts`

Expected: PASS (including existing assignKey conflict tests — registering `asKey` then `assignKey(asKey)` for the same provider must still be allowed)

- [ ] **Step 5: Commit**

```bash
git add src/provider/provider.ts tests/provider/provider-aliases.test.ts
git commit -m "$(cat <<'EOF'
feat: register provider asKey in alias map at creation

EOF
)"
```

---

### Task 3: Always resolve through provider (remove short-circuit)

**Files:**
- Modify: `src/container/container.ts`
- Modify: `src/types.ts` (only if needed later in Task 4; skip signature change here)
- Test: `tests/container/container.test.ts`

**Interfaces:**
- Consumes: `getProviderByAliasKey`, provider callables
- Produces: `resolve(provider | ownedSymbol)` always calls provider; orphan symbols throw even when a descriptor exists

- [ ] **Step 1: Update / add failing tests**

In `tests/container/container.test.ts`:

1. Change the test that currently does `register(key, factory)` then `expect(container.resolve(key)).toBe(descriptor.instance)` so it expects a throw for an orphan symbol, and add a separate assertion that `get(key)` still returns the registered descriptor:

```ts
it('registers descriptors directly by symbol key but resolve requires a provider-owned key', () => {
  const container = new Container()
  const key = Symbol('registered')
  const factory = vi.fn(() => ({ id: 'registered' }))

  const descriptor = container.register(key, factory)

  expect(factory).toHaveBeenCalledWith({ dc: container })
  expect(container.get(key)).toBe(descriptor)
  expect(container.size).toBe(1)
  expect(() => container.resolve(key)).toThrow(
    'Dependency descriptor not found for symbol key',
  )
})
```

2. Add:

```ts
it('resolves an existing instance by provider.asKey through the provider', () => {
  const container = new Container()
  const useDependency = provider(() => ({ id: 'by-as-key' }))

  const first = container.resolve(useDependency)
  const second = container.resolve(useDependency.asKey)

  expect(second).toBe(first)
  expect(container.size).toBe(1)
})
```

3. Keep / ensure nested provider resolve still passes with no short-circuit.

- [ ] **Step 2: Run tests to verify intended failures**

Run: `pnpm exec vitest run tests/container/container.test.ts`

Expected: the renamed/orphan-symbol test fails until short-circuit is removed (if short-circuit still returns the instance); the `asKey` test should already pass after Task 2.

- [ ] **Step 3: Implement resolve without short-circuit**

Replace `resolve` in `src/container/container.ts` with:

```ts
resolve<Target> (keyOrProvider: symbol | Provider<Target>): Target {
  const providerFn = typeof keyOrProvider === 'symbol'
    ? getProviderByAliasKey<Target>(keyOrProvider)
    : keyOrProvider

  if (!providerFn) {
    throw new Error('Dependency descriptor not found for symbol key')
  }

  try {
    pushContainer(this)
    return providerFn()
  } finally {
    popContainer()
  }
}
```

Remove the `this.get` early-return block entirely.

- [ ] **Step 4: Run container + provider tests**

Run:

```bash
pnpm exec vitest run tests/container/container.test.ts tests/provider/provider.test.ts tests/provider/provider-aliases.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/container/container.ts tests/container/container.test.ts
git commit -m "$(cat <<'EOF'
fix: resolve only through provider-owned keys

EOF
)"
```

---

### Task 4: Optional `scope` argument on `resolve`

**Files:**
- Modify: `src/types.ts`
- Modify: `src/container/container.ts`
- Test: `tests/container/container.test.ts` and/or `tests/provider/provider.test.ts`

**Interfaces:**
- Consumes: `createScope(): EffectScope`, Task 3 `resolve` path
- Produces:
  - `DependencyContainer.resolve<Target>(keyOrProvider: symbol | Provider<Target>, scope?: EffectScope): Target`
  - When `scope` is passed: `scope.run(() => providerFn())`
  - When omitted: same as Task 3

- [ ] **Step 1: Write failing tests**

Add to `tests/container/container.test.ts` (import `createScope` from `../../src/scope/create-scope`):

```ts
it('binds resolve to a custom scope and removes the descriptor when the scope stops', () => {
  const container = new Container()
  const instance = { id: 'scoped', destructor: vi.fn() }
  const useDependency = provider(() => instance)
  const deleteSpy = vi.spyOn(container, 'delete')
  const scope = createScope()

  const result = container.resolve(useDependency, scope)

  expect(result).toBe(instance)
  expect(container.size).toBe(1)

  scope.stop()

  expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
  expect(container.size).toBe(0)
  expect(instance.destructor).toHaveBeenCalledTimes(1)
})

it('wires disposal for an already-existing descriptor when resolve is called with a scope', () => {
  const container = new Container()
  const useDependency = provider(() => ({ id: 'late-bind' }))
  const deleteSpy = vi.spyOn(container, 'delete')

  // create without scope (no cleanup wiring)
  expect(container.resolve(useDependency)).toEqual({ id: 'late-bind' })
  expect(container.size).toBe(1)

  const scope = createScope()
  container.resolve(useDependency, scope)
  expect(container.size).toBe(1)

  scope.stop()
  expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
  expect(container.size).toBe(0)
})

it('keeps a shared instance until the last custom scope stops', () => {
  const container = new Container()
  const useDependency = provider(() => ({ id: 'shared-scopes' }))
  const deleteSpy = vi.spyOn(container, 'delete')
  const scopeA = createScope()
  const scopeB = createScope()

  container.resolve(useDependency, scopeA)
  container.resolve(useDependency, scopeB)

  scopeA.stop()
  expect(container.size).toBe(1)
  expect(deleteSpy).not.toHaveBeenCalled()

  scopeB.stop()
  expect(deleteSpy).toHaveBeenCalledWith(useDependency.asKey)
  expect(container.size).toBe(0)
})

it('does not dispose a persistent instance when the custom scope stops', () => {
  const container = new Container()
  const useDependency = provider(() => ({ id: 'persistent' }), {
    persistentInstance: true,
  })
  const deleteSpy = vi.spyOn(container, 'delete')
  const scope = createScope()

  const result = container.resolve(useDependency, scope)
  scope.stop()

  expect(result).toEqual({ id: 'persistent' })
  expect(deleteSpy).not.toHaveBeenCalled()
  expect(container.get(useDependency)?.instance).toEqual({ id: 'persistent' })
})
```

Also update the existing test `does not bind container.resolve to a Vue scope when none is active` in `tests/provider/provider.test.ts` — it should still pass (no scope arg).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/container/container.test.ts -t "binds resolve to a custom scope"`

Expected: FAIL (TypeScript/runtime: second argument unused / no disposal)

- [ ] **Step 3: Update types and implementation**

In `src/types.ts`, add Vue import and update the interface:

```ts
import type { EffectScope } from 'vue'
import type { Vue as VueInstance } from 'vue/types/vue'

// ...

export interface DependencyContainer {
  resolve<Target> (
    keyOrProvider: symbol | Provider<Target>,
    scope?: EffectScope,
  ): Target
  get size (): number
  get vueApp (): VueInstance | undefined
}
```

In `src/container/container.ts`:

```ts
import type { EffectScope } from 'vue'
// keep existing imports

resolve<Target> (
  keyOrProvider: symbol | Provider<Target>,
  scope?: EffectScope,
): Target {
  const providerFn = typeof keyOrProvider === 'symbol'
    ? getProviderByAliasKey<Target>(keyOrProvider)
    : keyOrProvider

  if (!providerFn) {
    throw new Error('Dependency descriptor not found for symbol key')
  }

  try {
    pushContainer(this)
    if (scope) {
      return scope.run(() => providerFn()) as Target
    }
    return providerFn()
  } finally {
    popContainer()
  }
}
```

Use `as Target` because Vue types `EffectScope.run` as `T | undefined`.

- [ ] **Step 4: Run focused and related suites**

Run:

```bash
pnpm exec vitest run tests/container/container.test.ts tests/provider/provider.test.ts tests/provider/provider-aliases.test.ts tests/scope/create-scope.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/container/container.ts tests/container/container.test.ts tests/provider/provider.test.ts
git commit -m "$(cat <<'EOF'
feat: allow optional EffectScope on container.resolve

EOF
)"
```

---

### Task 5: Docs + full verification

**Files:**
- Modify: `docs/container-resolution.md`
- Optionally mention in `README.md` Features / Quick start only if a one-liner fits without expanding scope

**Interfaces:**
- Consumes: public API from Tasks 1–4
- Produces: accurate docs for `createScope` and `resolve(..., scope)`

- [ ] **Step 1: Update `docs/container-resolution.md`**

Update the public API summary to include:

- `createScope()`
- `DependencyContainer.resolve(providerOrKey, scope?)`

Replace the section **Important lifecycle note for `resolve()`** with:

- Without `scope`: create/reuse via provider; no caller-scope binding if no Vue scope is current.
- With `scope`: run inside that scope so non-persistent instances attach `onScopeDispose`; `scope.stop()` disposes when it is the last parent scope.
- `resolve` requires a provider object or a provider-owned key (`asKey` / `assignKey`). Orphan symbols throw.
- `persistentInstance: true` ignores scope cleanup (same as setup).

Add a short usage example with `createScope()`.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test -- --run`

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add docs/container-resolution.md README.md
git commit -m "$(cat <<'EOF'
docs: document scope-bound resolve and createScope

EOF
)"
```

(Omit `README.md` from `git add` if unchanged.)

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| `createScope()` export | Task 1 |
| Register default `asKey` in alias map | Task 2 |
| Remove resolve short-circuit; always call provider | Task 3 |
| Orphan symbol throws even with descriptor | Task 3 |
| Optional `scope` on `resolve` + `scope.run` | Task 4 |
| Late-bind disposal for existing descriptor | Task 4 |
| Multi-scope shared disposal | Task 4 |
| Persistent + scope = no dispose | Task 4 |
| Docs update | Task 5 |
| `provider()` logic unchanged | All tasks (no edits to disposal branches) |

No placeholders remain. Types: `EffectScope` from `vue`, `createScope(): EffectScope`, `resolve(..., scope?: EffectScope)`.
