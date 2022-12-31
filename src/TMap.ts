/**
 * @since 1.0.0
 */
import * as internal from "@effect/stm/internal/tMap"
import type * as STM from "@effect/stm/STM"
import type * as TArray from "@effect/stm/TArray"
import type * as TRef from "@effect/stm/TRef"
import type * as Chunk from "@fp-ts/data/Chunk"
import type { LazyArg } from "@fp-ts/data/Function"
import type * as HashMap from "@fp-ts/data/HashMap"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const TMapTypeId: unique symbol = internal.TMapTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type TMapTypeId = typeof TMapTypeId

/**
 * Transactional map implemented on top of `TRef` and `TArray`. Resolves
 * conflicts via chaining.
 *
 * @since 1.0.0
 * @category models
 */
export interface TMap<K, V> extends TMap.Variance<K, V> {}
/**
 * @internal
 * @since 1.0.0
 */
export interface TMap<K, V> {
  /** @internal */
  readonly tBuckets: TRef.TRef<TArray.TArray<Chunk.Chunk<readonly [K, V]>>>
  /** @internal */
  readonly tSize: TRef.TRef<number>
}

/**
 * @since 1.0.0
 */
export declare namespace TMap {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<K, V> {
    readonly [TMapTypeId]: {
      readonly _K: (_: never) => K
      readonly _V: (_: never) => V
    }
  }
}

/**
 * Makes an empty `TMap`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const empty: <K, V>() => STM.STM<never, never, TMap<K, V>> = internal.empty

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const find: <K, V, A>(
  pf: (key: K, value: V) => Option.Option<A>
) => (self: TMap<K, V>) => STM.STM<never, never, Option.Option<A>> = internal.find

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const findSTM: <K, V, R, E, A>(
  f: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
) => (self: TMap<K, V>) => STM.STM<R, E, Option.Option<A>> = internal.findSTM

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const findAll: <K, V, A>(
  pf: (key: K, value: V) => Option.Option<A>
) => (self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<A>> = internal.findAll

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const findAllSTM: <K, V, R, E, A>(
  pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
) => (self: TMap<K, V>) => STM.STM<R, E, Chunk.Chunk<A>> = internal.findAllSTM

/**
 * Atomically performs transactional-effect for each binding present in map.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forEach: <K, V, R, E, _>(
  f: (key: K, value: V) => STM.STM<R, E, _>
) => (self: TMap<K, V>) => STM.STM<R, E, void> = internal.forEach

/**
 * Makes a new `TMap` initialized with provided iterable.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable: <K, V>(
  iterable: Iterable<readonly [K, V]>
) => STM.STM<never, never, TMap<K, V>> = internal.fromIterable

/**
 * Retrieves value associated with given key.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const get: <K>(key: K) => <V>(self: TMap<K, V>) => STM.STM<never, never, Option.Option<V>> = internal.get

/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const getOrElse: <K, V>(key: K, fallback: LazyArg<V>) => (self: TMap<K, V>) => STM.STM<never, never, V> =
  internal.getOrElse

/**
 * Tests whether or not map contains a key.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const has: <K>(key: K) => <V>(self: TMap<K, V>) => STM.STM<never, never, boolean> = internal.has

/**
 * Tests if the map is empty or not.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const isEmpty: <K, V>(self: TMap<K, V>) => STM.STM<never, never, boolean> = internal.isEmpty

/**
 * Collects all keys stored in map.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const keys: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<K>> = internal.keys

/**
 * Makes a new `TMap` that is initialized with specified values.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const make: <K, V>(...entries: Array<readonly [K, V]>) => STM.STM<never, never, TMap<K, V>> = internal.make

/**
 * If the key is not already associated with a value, stores the provided value,
 * otherwise merge the existing value with the new one using function `f` and
 * store the result.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const merge: <K, V>(key: K, value: V, f: (x: V, y: V) => V) => (self: TMap<K, V>) => STM.STM<never, never, V> =
  internal.merge

/**
 * Atomically folds using a pure function.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduce: <Z, V>(
  zero: Z,
  f: (acc: Z, value: V) => Z
) => <K>(self: TMap<K, V>) => STM.STM<never, never, Z> = internal.reduce

/**
 * Atomically folds using a transactional function.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceSTM: <Z, V, R, E>(
  zero: Z,
  f: (acc: Z, value: V) => STM.STM<R, E, Z>
) => <K>(self: TMap<K, V>) => STM.STM<R, E, Z> = internal.reduceSTM

/**
 * Atomically folds using a pure function.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceWithIndex: <Z, K, V>(
  zero: Z,
  f: (acc: Z, value: V, key: K) => Z
) => (self: TMap<K, V>) => STM.STM<never, never, Z> = internal.reduceWithIndex

/**
 * Atomically folds using a transactional function.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceWithIndexSTM: <Z, V, K, R, E>(
  zero: Z,
  f: (acc: Z, value: V, key: K) => STM.STM<R, E, Z>
) => (self: TMap<K, V>) => STM.STM<R, E, Z> = internal.reduceWithIndexSTM

/**
 * Removes binding for given key.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const remove: <K>(key: K) => <V>(self: TMap<K, V>) => STM.STM<never, never, void> = internal.remove

/**
 * Deletes all entries associated with the specified keys.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const removeAll: <K>(keys: Iterable<K>) => <V>(self: TMap<K, V>) => STM.STM<never, never, void> =
  internal.removeAll

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const removeIf: <K, V>(
  predicate: (key: K, value: V) => boolean
) => (self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<readonly [K, V]>> = internal.removeIf

/**
 * Removes bindings matching predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const removeIfDiscard: <K, V>(
  predicate: (key: K, value: V) => boolean
) => (self: TMap<K, V>) => STM.STM<never, never, void> = internal.removeIfDiscard

/**
 * Retains bindings matching predicate and returns removed bindings.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retainIf: <K, V>(
  predicate: (key: K, value: V) => boolean
) => (self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<readonly [K, V]>> = internal.retainIf

/**
 * Retains bindings matching predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retainIfDiscard: <K, V>(
  predicate: (key: K, value: V) => boolean
) => (self: TMap<K, V>) => STM.STM<never, never, void> = internal.retainIfDiscard

/**
 * Stores new binding into the map.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const set: <K, V>(key: K, value: V) => (self: TMap<K, V>) => STM.STM<never, never, void> = internal.set

/**
 * Stores new binding in the map if it does not already exist.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const setIfAbsent: <K, V>(key: K, value: V) => (self: TMap<K, V>) => STM.STM<never, never, void> =
  internal.setIfAbsent

/**
 * Returns the number of bindings.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const size: <K, V>(self: TMap<K, V>) => STM.STM<never, never, number> = internal.size

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const takeFirst: <K, V, A>(
  pf: (key: K, value: V) => Option.Option<A>
) => (self: TMap<K, V>) => STM.STM<never, never, A> = internal.takeFirst

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const takeFirstSTM: <K, V, R, E, A>(
  pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
) => (self: TMap<K, V>) => STM.STM<R, E, A> = internal.takeFirstSTM

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const takeSome: <K, V, A>(
  pf: (key: K, value: V) => Option.Option<A>
) => (self: TMap<K, V>) => STM.STM<never, never, Chunk.NonEmptyChunk<A>> = internal.takeSome

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const takeSomeSTM: <K, V, R, E, A>(
  pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
) => (self: TMap<K, V>) => STM.STM<R, E, Chunk.NonEmptyChunk<A>> = internal.takeSomeSTM

/**
 * Collects all bindings into a `Chunk`.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const toChunk: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<readonly [K, V]>> = internal.toChunk

/**
 * Collects all bindings into a `HashMap`.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const toHashMap: <K, V>(self: TMap<K, V>) => STM.STM<never, never, HashMap.HashMap<K, V>> = internal.toHashMap

/**
 * Collects all bindings into a `ReadonlyArray`.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const toReadonlyArray: <K, V>(self: TMap<K, V>) => STM.STM<never, never, ReadonlyArray<readonly [K, V]>> =
  internal.toReadonlyArray

/**
 * Collects all bindings into a `ReadonlyMap`.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const toReadonlyMap: <K, V>(self: TMap<K, V>) => STM.STM<never, never, ReadonlyMap<K, V>> =
  internal.toReadonlyMap

/**
 * Atomically updates all bindings using a pure function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const transform: <K, V>(
  f: (key: K, value: V) => readonly [K, V]
) => (self: TMap<K, V>) => STM.STM<never, never, void> = internal.transform

/**
 * Atomically updates all bindings using a transactional function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const transformSTM: <K, V, R, E>(
  f: (key: K, value: V) => STM.STM<R, E, readonly [K, V]>
) => (self: TMap<K, V>) => STM.STM<R, E, void> = internal.transformSTM

/**
 * Atomically updates all values using a pure function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const transformValues: <V>(f: (value: V) => V) => <K>(self: TMap<K, V>) => STM.STM<never, never, void> =
  internal.transformValues

/**
 * Atomically updates all values using a transactional function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const transformValuesSTM: <V, R, E>(
  f: (value: V) => STM.STM<R, E, V>
) => <K>(self: TMap<K, V>) => STM.STM<R, E, void> = internal.transformValuesSTM

/**
 * Updates the mapping for the specified key with the specified function,
 * which takes the current value of the key as an input, if it exists, and
 * either returns `Some` with a new value to indicate to update the value in
 * the map or `None` to remove the value from the map. Returns `Some` with the
 * updated value or `None` if the value was removed from the map.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateWith: <K, V>(
  key: K,
  f: (value: Option.Option<V>) => Option.Option<V>
) => (self: TMap<K, V>) => STM.STM<never, never, Option.Option<V>> = internal.updateWith

/**
 * Collects all values stored in map.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const values: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<V>> = internal.values