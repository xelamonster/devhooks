import { debounce, type DebounceOptions } from "perfect-debounce"
import { type DependencyList, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { depsChanged, shallowMerge, type UnknownRecord } from "./utils"

/**
 * `useAsyncCb` provides a sync callback for an async function
 * along with helpers to track the state.
 */
export const useAsyncCb = <A extends unknown[], R>(
  fnAsync: (...args: A) => Promise<R>,
  onError?: (err: Error) => void,
) => {
  const [res, setRes] = useState<R | undefined>(undefined)
  const [err, setErr] = useState<Error | undefined>(undefined)
  const [isReady, setIsReady] = useState(false)
  const fn = useCallback((...args: A) => {
    void fnAsync(...args).then(setRes).catch((err: unknown) => {
      onError?.(err as Error)
      setErr(err as Error)
    }).finally(() => setIsReady(true))
  }, [fnAsync, onError])
  return [res, err, isReady, fn]
}

/**
 * `useAutoReducer` gives a preconfigured `useReducer` hook which is enough
 * for most needs. The `state` is initialized to the given value, and the
 * `dispatch` function accepts fragments of `state` which are merged in.
 */
export const useAutoReducer = <S extends UnknownRecord>(initState: S) =>
  useReducer(
    (state: S, action: Partial<S> | ((prev: S) => Partial<S>)): S =>
      shallowMerge(state, typeof action === "function" ? action(state) : action),
    initState,
  )

/**
 * `useCurrentRef` escapes closures. `ref.current` will always be
 * the latest `val` even if `ref` is captured.
 */
export const useCurrentRef = <T>(val: T) => {
  const ref = useRef(val)
  ref.current = val
  return ref
}

/**
 * `useDebounce` gives a value that delays updates to `val` by the duration `dur`.
 */
export const useDebounce = <T>(val: T, dur = 300): T => {
  const [debounced, setDebounced] = useState(val)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(val), dur)
    return () => clearTimeout(timer)
  }, [val, dur])
  return debounced
}

/**
 * `useDebounceFn` consolidates multiple calls tp `fn` within duration `dur` into one.
 * Calls the given function immediately, use `opts` to change behavior.
 */
export const useDebounceFn = <F extends (...args: Parameters<F>) => ReturnType<F>>(
  fn: F,
  dur = 300,
  opts: DebounceOptions = { leading: true },
): (...args: Parameters<F>) => Promise<ReturnType<F>> => {
  const ref = useCurrentRef(fn)
  return useStaticMemo(
    () => debounce((...args: Parameters<F>): ReturnType<F> => ref.current(...args), dur, opts),
    [dur, opts],
  )
}

/**
 * `useMutexFn` returns a callback that allows one call to `fn` and
 * ignores all subsequent calls until it completes.
 */
export const useMutexFn = <F extends (...args: Parameters<F>) => Promise<void>>(fn: F) => {
  const lockRef = useRef(false)
  return useCallback(async (...args: Parameters<F>): Promise<void> => {
    if (lockRef.current) return
    lockRef.current = true
    try {
      await fn(...args)
    } finally {
      lockRef.current = false
    }
  }, [fn])
}

/**
 * `useStaticMutexFn` is the same as `useMutexFn`, but the returned ref is wrapped
 * with `useStaticFn` instead of the standard `useCallback`.
 */
export const useStaticMutexFn = <F extends (...args: Parameters<F>) => Promise<void>>(fn: F) => {
  const lockRef = useRef(false)
  return useStaticFn(async (...args: Parameters<F>): Promise<void> => {
    if (lockRef.current) return
    lockRef.current = true
    try {
      await fn(...args)
    } finally {
      lockRef.current = false
    }
  })
}

/**
 * `useStaticMemo` will _never_ recompute the value unless `deps` change,
 * even if React thinks it'd be funny.
 */
export const useStaticMemo = <T>(gen: () => T, deps: DependencyList = []): T => {
  const ref = useRef<{ val?: T; deps: DependencyList; init: boolean }>({ deps: deps, init: true })
  if (!ref.current.init || (depsChanged(ref.current.deps, deps))) {
    ref.current.val = gen()
    ref.current.deps = deps
    ref.current.init = false
  }
  return ref.current.val as T
}

/**
 * `useStaticFn` gives a ref to `fn` which always calls the latest `fn`,
 * but won't trigger rerenders if `fn` changes.
 */
export const useStaticFn = <F extends (...args: Parameters<F>) => ReturnType<F>>(fn: F): F => {
  const ref = useRef<F>(fn)
  ref.current = useMemo<F>(() => fn, [fn])
  const staticRef = useRef<(...args: Parameters<F>) => ReturnType<F>>()
  if (!staticRef.current) {
    staticRef.current = (...args: Parameters<F>): ReturnType<F> => ref.current(...args)
  }
  return staticRef.current as F
}

/**
 *  `useStaticEffect` will be called once and only once,
 * without complaints about incomplete deps arrays.
 */
export const useStaticEffect = (fn: () => void) => useEffect(useStaticFn(fn), [])
