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

export const promised = <P>(val: P | Promise<P>): Promise<P> => {
  return isPromise(val) ? val : new Promise((resolve) => resolve(val))
}

export const isFn = (x: Option): x is Fn => {
  return typeof x === "function"
}

export const isPromise = <T>(x: T | Promise<T>): x is Promise<T> => {
  if (!x) return false
  const typeofx = typeof x
  // biome-ignore lint/suspicious/noExplicitAny: we need to check potentially undefined fields here
  return (typeofx === "object" || typeofx === "function") && isFn((x as any).then) && isFn((x as any).catch)
}

export type UnknownRecord = Record<string | number | symbol, unknown>
export type UnknownPromise = Promise<unknown>
export type Unpromised<P> = P extends Promise<infer T> ? T : P
export type Option<T = unknown> = T | undefined
export type AsyncOption<T = unknown> = Option<Unpromised<T>>
export type Fn<A extends unknown[] = unknown[], R = unknown> = (...args: A) => R
export type FnArgs<F extends Fn = Fn> = Parameters<F> & unknown[]
export type InferredFn<F extends Fn> = Fn<FnArgs<F>, ReturnType<F>>
export type InferredAsyncFn<F extends AsyncFn> = Fn<FnArgs<F>, Promise<ReturnType<F>>>
export type AsyncFn<A extends FnArgs = unknown[], R extends UnknownPromise = UnknownPromise> = Fn<A, R>
export type FallibleFn<A extends FnArgs = unknown[], R extends Option = Option> = Fn<A, R>
export type FallibleAsyncFn<A extends FnArgs = unknown[], R extends Promise<Option> = Promise<Option>> = Fn<
  A,
  R
>
export type AsSyncFn<F extends Fn> = Fn<FnArgs<F>, Unpromised<ReturnType<F>>>
export type AsAsyncFn<F extends Fn> = Fn<FnArgs<F>, Promise<ReturnType<F>>>
export type AsFallibleFn<F extends Fn> = Fn<FnArgs<F>, Option<ReturnType<F>>>
export type AsFallibleAsyncFn<F extends Fn> = Fn<FnArgs<F>, Promise<AsyncOption<ReturnType<F>>>>
