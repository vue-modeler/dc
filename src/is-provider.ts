

export function isProvider (
  func: (...args: unknown[]) => unknown,
): boolean {
  return typeof func === 'function' && '__isProvider__' in func
}

  