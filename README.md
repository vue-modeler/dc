# Dependency container for VUE

[![test](https://github.com/vue-modeler/dc/actions/workflows/test.yml/badge.svg)](https://github.com/vue-modeler/dc/actions/workflows/test.yml)

> Compatible with Vue 2 only.  

## Overview

Plugin implements a lightweight dependency container for Vue applications based on the effectScope API. Similar to VueUse's [createSharedComposable](https://github.com/vueuse/vueuse/blob/main/packages/shared/createSharedComposable/index.md), but with enhanced instance management.

### Key Features

- 🗑️ Automatic cleanup when instances are not in use
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

...

Vue.use(vueModelerDc)

...

const app = new Vue()
...
// Get instance by factory function
const instance = app.$vueModelerDc.get(factoryFunction)

```

## Basic Usage

### Define provider

Create a provider using `defineProvider`:

```typescript
import { defineProvider } from '@vue-modeler/dc'

const useMyProvider = defineProvider(() => {
  // Your factory function
  return {
    // Instance data/methods
  }
})
```
### Usage in Components

```vue
<template>
  <div>{{ model.state }}</div>
</template>

<script setup lang="ts">
import { useMyProvider } from '@/providers/myProvider'

const model = useMyProvider()
</script>
```

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
import { defineProvider } from '@vue-modeler/dc'
import { MyModel } from '@/application/models/MyModel'
import { api } from '@/infrastructure/api'

export const useMyModel = defineProvider(() => new MyModel(api))
```
