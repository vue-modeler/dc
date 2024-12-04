# Dependency container for VUE

[![test](https://github.com/vue-modeler/dc/actions/workflows/test.yml/badge.svg)](https://github.com/vue-modeler/dc/actions/workflows/test.yml)

> Compatible with Vue 2 only.  

## Overview

Plugin implements a lightweight dependency container for Vue applications based on the effectScope API. Similar to VueUse's [createSharedComposable](https://github.com/vueuse/vueuse/blob/main/packages/shared/createSharedComposable/index.md), but with enhanced instance management.

### Key Features

- 🗑️ Automatic cleanup when instances are not in use
- 💾 Optional persistent instances that survive scope disposal
- 🔒 Type Safe
- 🪶 Lightweight
- 🎯 Simple API
- 🔄 Supports sharing any data type
- ✨ Single responsibility principle compliant


## Why Use This?

Modern applications (PWA, SPA) often need to share instances across:
- Components on the same page
- Different routes/pages
- Device-specific implementations (mobile/desktop)

This plugin:
 - simplifies instance sharing 
 - helps separate business logic from view logic, enabling proper Domain-Driven Design (DDD) architecture.
 - helps to create persistent instances which will not be disposed when the component is unmounted
 - provides direct access to the container instance by `$vueModelerDc` property of the Vue instance 
 
> **Important Notes:**
> 1. The container manages instance scope, not state
> 2. SSR compatible, but doesn't handle state transfer from server to client

## Instalation 

```js
import { vueModelerDc } from '@vue-modeler/dc'
import Vue from 'vue'

Vue.use(vueModelerDc)
...

const app = new Vue()
...

const useDependency = provider(() => 'test')
...
// Get instance by factory function
const instance = app.$vueModelerDc.get(useDependency.asKey).instance
```

## Basic Usage

### Define provider

Create a provider using `provider`:

```typescript
import { provider } from '@vue-modeler/dc'

const useDependency = provider(() => {
  // Your factory function
  return {
    // Instance data/methods
  }
})
```
### Usage in Components

```xml
<template>
  <div>{{ model.state }}</div>
</template>

<script setup lang="ts">
import { useDependency } from '@/providers/myDependency'

const model = useDependency()
</script>
```
### Persistent Instances

You can create persistent instances that won't be disposed when all scopes are stopped. This is useful for services that need to maintain their state throughout the application lifecycle:

```typescript
const usePersistentService = provider(
  () => new MyService(), // Factory function
  { persistentInstance: true }, // Options
)
```

Key features of persistent instances:
- Instance remains in container after all scopes are disposed
- State is preserved between different component mounts
- Nested providers inside persistent provider also become persistent
- Useful for global services, caches, or state managers

Example with nested providers:
```typescript
// Nested provider becomes persistent when used inside persistent provider
const useNestedService = provider(() => new NestedService())

const usePersistentService = provider(
  () => new MainService(useNestedService()), // nested service will be persistent
  { persistentInstance: true },
)
```

> **Note:** Use persistent instances carefully as they won't be automatically cleaned up by the container.

### Best Practices

#### **1. Possible File Organization**
```
src/
  ├── application/         # Business logic
  │   ├── models/          # Domain models
  │   └── services/        # Business services
  ├── infrastructure/      # External services, APIs
  └── providers/           # Container providers
```

#### **2.Example Implementation**

```typescript
// infrastructure/api.ts
export const api = {
  fetchState(): Promise<Record<string, unknown>> {
    // Simulating API call with timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ someField: 'someValue' })
      }, 1000)
    })
  }
}

// application/models/MyModel.ts
import { shallowRef, type ShallowRef } from 'vue'

interface Api {
  fetchState(): Promise<Record<string, unknown>>
}

export class MyModel {
  private state: ShallowRef<Record<string, unknown>>

  constructor(private api: Api) {
    this.state = shallowRef({})
    this.initialize()
  }

  private async initialize(): Promise<void> {
    this.state.value = await this.api.fetchState()
  }

  destroy(): void {
    this.state.value = {}
  }
}

// providers/myProvider.ts
import { provider } from '@vue-modeler/dc'
import { MyModel } from '@/application/models/MyModel'
import { api } from '@/infrastructure/api'

export const useMyModel = provider(() => new MyModel(api))
```
