import localForage from "localforage"
import { debounce, type DebounceOptions } from "perfect-debounce"
import {
  type DependencyList,
  type Dispatch,
  type EffectCallback,
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import {
  type AsAsyncVoidFn,
  type AsVoidFn,
  type AsyncEffectFn,
  depsChanged,
  type EffectFn,
  type InferredAsyncFn,
  type InferredFn,
  type ResLoading,
  shallowMerge,
  type UnknownRecord,
  type UnPromise,
} from "./utils"

/**
 * `useAsyncCb` provides a sync callback for an async function
 * along with helpers to track the state.
 */
export const useAsyncCb = <F extends InferredAsyncFn<F>>(
  fn: F,
  deps: DependencyList = [],
  onError?: (err: Error) => void,
): [ResLoading<UnPromise<ReturnType<F>>>, AsVoidFn<F>, EffectFn] => {
  const [res, setRes] = useState<ResLoading<UnPromise<ReturnType<F>>>>({ loading: false })
  const fnSync = useStaticCb((...args: Parameters<F>) => {
    setRes({ loading: true })
    void fn(...args).then((ok) => setRes({ ok, loading: false })).catch((err: unknown) => {
      setRes({ err: err as Error, loading: false })
      onError?.(err as Error)
    })
  }, [fn, onError, ...deps])
  return [res, fnSync, () => setRes({ loading: false })]
}

/**
 * `useAsyncEffect` handles async `useEffect` methods with optional error handling.
 */
export const useAsyncEffect = <F extends AsyncEffectFn & InferredAsyncFn<F>>(
  fn: F,
  deps: DependencyList = [],
  onError?: (err: Error) => void,
): void => {
  const [res, fnSync, clear] = useAsyncCb(fn)

  useStaticEffect(() => {
    if (res.loading) return
    if (res.err) {
      clear()
      if (!onError) throw res.err
      onError(res.err)
    }
    ;(fnSync as EffectFn)()
  }, [res.err, fnSync, ...deps])
}

/**
 * `useAutoReducer` gives a preconfigured `useReducer` hook which is enough
 * for most needs. The `state` is initialized to the given value, and the
 * `dispatch` function accepts fragments of `state` which are merged in.
 */
export const useAutoReducer = <S extends UnknownRecord>(
  initState: S,
): [S, Dispatch<Partial<S> | ((prev: S) => Partial<S>)>] =>
  useReducer(
    (state: S, action: Partial<S> | ((prev: S) => Partial<S>)): S =>
      shallowMerge(state, typeof action === "function" ? action(state) : action),
    initState,
  )

/**
 * `useCurrentRef` escapes closures. `ref.current` will always be
 * the latest `val` even if `ref` is captured.
 */
export const useCurrentRef = <T>(val: T): MutableRefObject<T> => {
  const ref = useRef<T>(val)
  ref.current = val
  return ref
}

/**
 * `useDebounceVal` gives a value that delays updates to `val` by the duration `dur`.
 */
export const useDebounceVal = <T>(val: T, dur = 300): T => {
  const [debounced, setDebounced] = useState(val)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(val), dur)
    return () => clearTimeout(timer)
  }, [val, dur])
  return debounced
}

/**
 * `useDebounceCb` consolidates multiple calls tp `fn` within duration `dur` into one.
 * Calls the given function immediately, use `opts` to change behavior.
 */
export const useDebounceCb = <F extends InferredFn<F>>(
  fn: F,
  deps: DependencyList = [],
  dur = 300,
  opts: DebounceOptions = { leading: true },
): (...args: Parameters<F>) => Promise<ReturnType<F>> => {
  const ref = useCurrentRef(fn)
  return useStaticMemo(
    () => debounce((...args: Parameters<F>): ReturnType<F> => ref.current(...args), dur, opts),
    [dur, opts, ...deps],
  )
}

/**
 * `useMutexCb` returns a callback that allows one call to `fn` and
 * ignores all subsequent calls until it completes.
 */
export const useMutexCb = <F extends InferredAsyncFn<F>>(
  fn: F,
  deps: DependencyList = [],
): AsAsyncVoidFn<F> => {
  const lockRef = useRef(false)
  return useCallback(async (...args: Parameters<F>): Promise<void> => {
    if (lockRef.current) return
    lockRef.current = true
    try {
      await fn(...args)
    } finally {
      lockRef.current = false
    }
  }, [fn, ...deps])
}

/**
 * `useStaticMutexCb` is the same as `useMutexCb`, but the returned ref is wrapped
 * with `useStaticCb` instead of the standard `useCallback`.
 */
export const useStaticMutexCb = <F extends InferredAsyncFn<F>>(
  fn: F,
  deps: DependencyList = [],
): AsAsyncVoidFn<F> => {
  const lockRef = useRef(false)
  return useStaticCb(async (...args: Parameters<F>): Promise<void> => {
    if (lockRef.current) return
    lockRef.current = true
    try {
      return await fn(...args)
    } finally {
      lockRef.current = false
    }
  }, deps)
}

/**
 * `useStaticMemo` will _never_ recompute the value unless `deps` change,
 * even if React thinks it'd be funny.
 */
export const useStaticMemo = <T>(gen: () => T, deps: DependencyList = []): T => {
  const ref = useRef<{ val?: T; deps: DependencyList; init: boolean }>({ deps: deps, init: false })
  if (!ref.current.init || (depsChanged(ref.current.deps, deps))) {
    ref.current.val = gen()
    ref.current.deps = deps
    ref.current.init = false
  }
  return ref.current.val as T
}

/**
 * `useStaticCb` gives a ref to `fn` which always calls the latest `fn`,
 * but won't trigger rerenders if `fn` changes.
 */
export const useStaticCb = <F extends InferredFn<F>>(fn: F, deps: DependencyList = []): F => {
  const ref = useRef<F>(fn)
  ref.current = useMemo<F>(() => fn, [fn, ...deps])
  const staticRef = useRef<(...args: Parameters<F>) => ReturnType<F>>()
  if (!staticRef.current) {
    staticRef.current = (...args: Parameters<F>): ReturnType<F> => ref.current(...args)
  }
  return staticRef.current as F
}

/**
 * `useStaticEffect` will be called once and only once,
 * without complaints about incomplete deps arrays.
 */
export const useStaticEffect = (fn: () => void, deps: DependencyList = []) => useEffect(useStaticCb(fn), deps)

/**
 * `useLocalStore` provides persistent state from local browser storage.
 */
export const useLocalStore = <T>(
  key: string,
  initVal?: T,
): [ResLoading<T>, (newVal?: T) => Promise<void>] => {
  const [store, setStore] = useState<ResLoading<T>>({ loading: true })

  const setLocalStore = useStaticCb(async (newVal?: T): Promise<void> => {
    await localForage.setItem(key, newVal)
    setStore({ ok: newVal, loading: false })
  }, [key])

  useAsyncEffect(async () => {
    const val = await localForage.getItem<T>(key)
    if (!val) setLocalStore(initVal)
    else setStore({ ok: val, loading: false })
  }, [key])

  return [store, setLocalStore]
}

export const useObserveState = (tag: string, state: UnknownRecord) => {
  const prevState = useRef<UnknownRecord>({})

  useEffect(() => {
    const keys = Object.keys({ ...prevState.current, ...state })
    const updated: UnknownRecord = {}
    let isUpdated = false
    for (const key of keys) {
      if (!Object.is(prevState.current[key], state[key])) {
        updated[key] = { prev: prevState.current[key], new: state[key] }
        isUpdated = true
      }
    }
    if (isUpdated) {
      console.log(`<devhooks:observe> State updated for "${tag}"`, updated)
    }
    prevState.current = state
  })
}

export const useObserveEffect = (fn: EffectCallback, deps: DependencyList, tag: string) => {
  const prevDeps = useRef<DependencyList>(deps)
  if (depsChanged(prevDeps.current, deps)) {
    const updated = { prev: prevDeps.current, new: deps }
    console.log(`<devhooks:observe> Effect deps updated for "${tag}"`, updated)
  }
  prevDeps.current = deps
  useEffect(fn, deps)
}
