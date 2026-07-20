declare module 'vue' {
  interface ComponentCustomProperties {
    $vueModelerDc: import('./types').DependencyContainer
  }
}

export {}
