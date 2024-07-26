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

export type UnknownRecord = Record<string | number | symbol, unknown>
