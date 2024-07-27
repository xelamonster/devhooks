import type { DependencyList } from "react"

export const depsChanged = (a: DependencyList, b: DependencyList): boolean => {
  if (a === b) return false
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return true
  }
  return false
}

export const shallowMerge = <T extends UnknownRecord, U extends T | Partial<T> | undefined>(
  init: T,
  ...objs: U[]
): T => objs.reduce((acc: T, obj: U) => obj ? Object.assign(acc, obj) : acc, { ...init })

export const isFn = (x: unknown): x is (...args: unknown[]) => unknown => {
  return typeof x === "function"
}

export const isPromise = <T>(x: T | Promise<T>): x is Promise<T> => {
  if (!x) return false
  const typeofx = typeof x
  // biome-ignore lint/suspicious/noExplicitAny: we need to check potentially undefined fields here
  return (typeofx === "object" || typeofx === "function") && isFn((x as any).then) && isFn((x as any).catch)
}

export type UnknownRecord = Record<string | number | symbol, unknown>
