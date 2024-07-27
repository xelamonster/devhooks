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
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type UnknownFn = (...args: any) => any
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type UnknownAsyncFn = (...args: any) => Promise<any>
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type UnknownVoidFn = (...args: any) => void
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type UnknownAsyncVoidFn = (...args: any) => Promise<void>
export type InferredFn<F extends UnknownFn> = (...args: Parameters<F>) => ReturnType<F>
export type InferredAsyncFn<F extends UnknownAsyncFn> = (
  ...args: Parameters<F>
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
) => AsPromise<ReturnType<F>> & Promise<any>
export type UnPromise<P> = P extends Promise<infer T> ? T : P
export type AsPromise<P> = P extends Promise<infer T> ? Promise<T> : Promise<P>
export type AsAsyncFn<F extends UnknownFn> = (...args: Parameters<F>) => AsPromise<ReturnType<F>>
export type AsSyncFn<F extends UnknownFn> = (...args: Parameters<F>) => UnPromise<ReturnType<F>>
export type AsVoidFn<F extends UnknownFn> = (...args: Parameters<F>) => void
export type AsAsyncVoidFn<F extends UnknownFn> = (...args: Parameters<F>) => Promise<void>
