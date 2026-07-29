# Dependency container for Vue

[![test](https://github.com/vue-modeler/di/actions/workflows/test.yml/badge.svg)](https://github.com/vue-modeler/di/actions/workflows/test.yml)

Lightweight dependency container for Vue based on `effectScope`. Shares instances across components with automatic cleanup, optional persistence, and SSR support.

**Docs:** [Dependency Container guide](https://vue-modeler.github.io/guides/)

## Version Compatibility

| @vue-modeler/di | Vue |
|----------------|-----|
| 3.x.x          | ^3.0.0 |
| 2.x.x          | ^2.7.0 |

> Version 3.x.x requires Vue 3. For Vue 2, use 2.x.x.

## Features

- Lazy creation and automatic cleanup when unused
- Optional persistent instances
- SSR compatible
- Service locator via `dc.resolve()` and scope-bound cleanup via `createScope()`
- `redefine()` for tests and SSR mocks
- Type-safe, lightweight API

## Installation

```bash
# Vue 3
npm install @vue-modeler/di@^3.0.0

# Vue 2
npm install @vue-modeler/di@^2.0.0
```

### Vue 3

```js
import { createApp } from 'vue'
import { vueModelerDc } from '@vue-modeler/di'

const app = createApp(App)
app.use(vueModelerDc)
app.mount('#app')
```

### Vue 2

```js
import Vue from 'vue'
import { vueModelerDc } from '@vue-modeler/di'

Vue.use(vueModelerDc)

new Vue({
  // your app configuration
}).$mount('#app')
```

## Quick start

```typescript
import { provider } from '@vue-modeler/di'

const useDependency = provider(() => ({
  // instance data/methods
}))
```

```vue
<script setup lang="ts">
import { useDependency } from '@/providers/myDependency'

const model = useDependency()
</script>
```

For providers, persistent instances, `resolve()`, `redefine()`, SSR, and more — see the [guide](https://vue-modeler.github.io/guides/).
