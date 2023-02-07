/**
 * @since 1.0.0
 */
import * as internal from "@effect/stm/internal_effect_untraced/tArray"
import type * as STM from "@effect/stm/STM"
import type * as TRef from "@effect/stm/TRef"
import type * as Option from "@fp-ts/core/Option"
import type { Predicate } from "@fp-ts/core/Predicate"
import type * as Order from "@fp-ts/core/typeclass/Order"
import type * as Chunk from "@effect/data/Chunk"

/**
 * @since 1.0.0
 * @category symbols
 */
export const TArrayTypeId: unique symbol = internal.TArrayTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type TArrayTypeId = typeof TArrayTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface TArray<A> extends TArray.Variance<A> {}
/**
 * @internal
 * @since 1.0.0
 */
export interface TArray<A> {
  /** @internal */
  readonly chunk: Chunk.Chunk<TRef.TRef<A>>
}

/**
 * @since 1.0.0
 */
export declare namespace TArray {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [TArrayTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @since 1.0.0
 * @category elements
 */
export const collectFirst: {
  <A, B>(self: TArray<A>, pf: (a: A) => Option.Option<B>): STM.STM<never, never, Option.Option<B>>
  <A, B>(pf: (a: A) => Option.Option<B>): (self: TArray<A>) => STM.STM<never, never, Option.Option<B>>
} = internal.collectFirst

/**
 * Finds the result of applying an transactional partial function to the first
 * value in its domain.
 *
 * @since 1.0.0
 * @category elements
 */
export const collectFirstSTM: {
  <A, R, E, B>(self: TArray<A>, pf: (a: A) => Option.Option<STM.STM<R, E, B>>): STM.STM<R, E, Option.Option<B>>
  <A, R, E, B>(pf: (a: A) => Option.Option<STM.STM<R, E, B>>): (self: TArray<A>) => STM.STM<R, E, Option.Option<B>>
} = internal.collectFirstSTM

/**
 * Determine if the array contains a specified value.
 *
 * @macro trace
 * @since 1.0.0
 * @category elements
 */
export const contains: {
  <A>(self: TArray<A>, value: A): STM.STM<never, never, boolean>
  <A>(value: A): (self: TArray<A>) => STM.STM<never, never, boolean>
} = internal.contains

/**
 * Count the values in the array matching a predicate.
 *
 * @macro trace
 * @since 1.0.0
 * @category folding
 */
export const count: {
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, number>
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, number>
} = internal.count

/**
 * Count the values in the array matching a transactional predicate.
 *
 * @macro trace
 * @since 1.0.0
 * @category folding
 */
export const countSTM: {
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, number>
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, number>
} = internal.countSTM

/**
 * Makes an empty `TArray`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: <A>() => STM.STM<never, never, TArray<A>> = internal.empty

/**
 * Atomically evaluate the conjunction of a predicate across the members of
 * the array.
 *
 * @since 1.0.0
 * @category elements
 */
export const every: {
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, boolean>
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, boolean>
} = internal.every

/**
 * Atomically evaluate the conjunction of a transactional predicate across the
 * members of the array.
 *
 * @since 1.0.0
 * @category elements
 */
export const everySTM: {
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, boolean>
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, boolean>
} = internal.everySTM

/**
 * Find the first element in the array matching the specified predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirst: {
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, Option.Option<A>>
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
} = internal.findFirst

/**
 * Get the first index of a specific value in the array.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstIndex: {
  <A>(self: TArray<A>, value: A): STM.STM<never, never, Option.Option<number>>
  <A>(value: A): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
} = internal.findFirstIndex

/**
 * Get the first index of a specific value in the array starting from the
 * specified index.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstIndexFrom: {
  <A>(self: TArray<A>, value: A, from: number): STM.STM<never, never, Option.Option<number>>
  <A>(value: A, from: number): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
} = internal.findFirstIndexFrom

/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstIndexWhere: {
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, Option.Option<number>>
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
} = internal.findFirstIndexWhere

/**
 * Get the index of the first entry in the array starting from the specified
 * index, matching a predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstIndexWhereFrom: {
  <A>(self: TArray<A>, predicate: Predicate<A>, from: number): STM.STM<never, never, Option.Option<number>>
  <A>(predicate: Predicate<A>, from: number): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
} = internal.findFirstIndexWhereFrom

/**
 * Get the index of the next entry that matches a transactional predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstIndexWhereSTM: {
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Option.Option<number>>
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, Option.Option<number>>
} = internal.findFirstIndexWhereSTM

/**
 * Starting at specified index, get the index of the next entry that matches a
 * transactional predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstIndexWhereFromSTM: {
  <A, R, E>(
    self: TArray<A>,
    predicate: (value: A) => STM.STM<R, E, boolean>,
    from: number
  ): STM.STM<R, E, Option.Option<number>>
  <A, R, E>(
    predicate: (value: A) => STM.STM<R, E, boolean>,
    from: number
  ): (self: TArray<A>) => STM.STM<R, E, Option.Option<number>>
} = internal.findFirstIndexWhereFromSTM

/**
 * Find the first element in the array matching a transactional predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findFirstSTM: {
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Option.Option<A>>
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, Option.Option<A>>
} = internal.findFirstSTM

/**
 * Find the last element in the array matching a predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findLast: {
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, Option.Option<A>>
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
} = internal.findLast

/**
 * Get the last index of a specific value in the array bounded above by a
 * specific index.
 *
 * @since 1.0.0
 * @category elements
 */
export const findLastIndex: {
  <A>(self: TArray<A>, value: A): STM.STM<never, never, Option.Option<number>>
  <A>(value: A): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
} = internal.findLastIndex

/**
 * Get the last index of a specific value in the array bounded above by a
 * specific index.
 *
 * @since 1.0.0
 * @category elements
 */
export const findLastIndexFrom: {
  <A>(self: TArray<A>, value: A, end: number): STM.STM<never, never, Option.Option<number>>
  <A>(value: A, end: number): (self: TArray<A>) => STM.STM<never, never, Option.Option<number>>
} = internal.findLastIndexFrom

/**
 * Find the last element in the array matching a transactional predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const findLastSTM: {
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Option.Option<A>>
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, Option.Option<A>>
} = internal.findLastSTM

/**
 * Atomically performs transactional effect for each item in array.
 *
 * @since 1.0.0
 * @category elements
 */
export const forEach: {
  <A, R, E>(self: TArray<A>, f: (value: A) => STM.STM<R, E, void>): STM.STM<R, E, void>
  <A, R, E>(f: (value: A) => STM.STM<R, E, void>): (self: TArray<A>) => STM.STM<R, E, void>
} = internal.forEach

/**
 * Makes a new `TArray` initialized with provided iterable.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable: <A>(iterable: Iterable<A>) => STM.STM<never, never, TArray<A>> = internal.fromIterable

/**
 * Extracts value from ref in array.
 *
 * @since 1.0.0
 * @category elements
 */
export const get: {
  <A>(self: TArray<A>, index: number): STM.STM<never, never, A>
  (index: number): <A>(self: TArray<A>) => STM.STM<never, never, A>
} = internal.get

/**
 * The first entry of the array, if it exists.
 *
 * @since 1.0.0
 * @category elements
 */
export const headOption: <A>(self: TArray<A>) => STM.STM<never, never, Option.Option<A>> = internal.headOption

/**
 * The last entry in the array, if it exists.
 *
 * @since 1.0.0
 * @category elements
 */
export const lastOption: <A>(self: TArray<A>) => STM.STM<never, never, Option.Option<A>> = internal.lastOption

/**
 * Makes a new `TArray` that is initialized with specified values.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: <Elements extends [any, ...Array<any>]>(
  ...elements: Elements
) => STM.STM<never, never, TArray<Elements[number]>> = internal.make

/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @since 1.0.0
 * @category elements
 */
export const maxOption: {
  <A>(self: TArray<A>, order: Order.Order<A>): STM.STM<never, never, Option.Option<A>>
  <A>(order: Order.Order<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
} = internal.maxOption

/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @since 1.0.0
 * @category elements
 */
export const minOption: {
  <A>(self: TArray<A>, order: Order.Order<A>): STM.STM<never, never, Option.Option<A>>
  <A>(order: Order.Order<A>): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
} = internal.minOption

/**
 * Atomically folds using a pure function.
 *
 * @since 1.0.0
 * @category folding
 */
export const reduce: {
  <Z, A>(self: TArray<A>, zero: Z, f: (accumulator: Z, current: A) => Z): STM.STM<never, never, Z>
  <Z, A>(zero: Z, f: (accumulator: Z, current: A) => Z): (self: TArray<A>) => STM.STM<never, never, Z>
} = internal.reduce

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @since 1.0.0
 * @category elements
 */
export const reduceOption: {
  <A>(self: TArray<A>, f: (x: A, y: A) => A): STM.STM<never, never, Option.Option<A>>
  <A>(f: (x: A, y: A) => A): (self: TArray<A>) => STM.STM<never, never, Option.Option<A>>
} = internal.reduceOption

/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @since 1.0.0
 * @category elements
 */
export const reduceOptionSTM: {
  <A, R, E>(self: TArray<A>, f: (x: A, y: A) => STM.STM<R, E, A>): STM.STM<R, E, Option.Option<A>>
  <A, R, E>(f: (x: A, y: A) => STM.STM<R, E, A>): (self: TArray<A>) => STM.STM<R, E, Option.Option<A>>
} = internal.reduceOptionSTM

/**
 * Atomically folds using a transactional function.
 *
 * @macro trace
 * @since 1.0.0
 * @category folding
 */
export const reduceSTM: {
  <Z, A, R, E>(self: TArray<A>, zero: Z, f: (accumulator: Z, current: A) => STM.STM<R, E, Z>): STM.STM<R, E, Z>
  <Z, A, R, E>(zero: Z, f: (accumulator: Z, current: A) => STM.STM<R, E, Z>): (self: TArray<A>) => STM.STM<R, E, Z>
} = internal.reduceSTM

/**
 * Returns the size of the `TArray`.
 *
 * @since 1.0.0
 * @category getters
 */
export const size: <A>(self: TArray<A>) => number = internal.size

/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const some: {
  <A>(self: TArray<A>, predicate: Predicate<A>): STM.STM<never, never, boolean>
  <A>(predicate: Predicate<A>): (self: TArray<A>) => STM.STM<never, never, boolean>
} = internal.some

/**
 * Determine if the array contains a value satisfying a transactional
 * predicate.
 *
 * @since 1.0.0
 * @category elements
 */
export const someSTM: {
  <A, R, E>(self: TArray<A>, predicate: (value: A) => STM.STM<R, E, boolean>): STM.STM<R, E, boolean>
  <A, R, E>(predicate: (value: A) => STM.STM<R, E, boolean>): (self: TArray<A>) => STM.STM<R, E, boolean>
} = internal.someSTM

/**
 * Collects all elements into a chunk.
 *
 * @since 1.0.0
 * @since 1.0.0
 * @category destructors
 */
export const toChunk: <A>(self: TArray<A>) => STM.STM<never, never, Chunk.Chunk<A>> = internal.toChunk

/**
 * Atomically updates all elements using a pure function.
 *
 * @since 1.0.0
 * @category elements
 */
export const transform: {
  <A>(self: TArray<A>, f: (value: A) => A): STM.STM<never, never, void>
  <A>(f: (value: A) => A): (self: TArray<A>) => STM.STM<never, never, void>
} = internal.transform

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @since 1.0.0
 * @category elements
 */
export const transformSTM: {
  <A, R, E>(self: TArray<A>, f: (value: A) => STM.STM<R, E, A>): STM.STM<R, E, void>
  <A, R, E>(f: (value: A) => STM.STM<R, E, A>): (self: TArray<A>) => STM.STM<R, E, void>
} = internal.transformSTM

/**
 * Updates element in the array with given function.
 *
 * @since 1.0.0
 * @category elements
 */
export const update: {
  <A>(self: TArray<A>, index: number, f: (value: A) => A): STM.STM<never, never, void>
  <A>(index: number, f: (value: A) => A): (self: TArray<A>) => STM.STM<never, never, void>
} = internal.update

/**
 * Atomically updates element in the array with given transactional effect.
 *
 * @since 1.0.0
 * @category elements
 */
export const updateSTM: {
  <A, R, E>(self: TArray<A>, index: number, f: (value: A) => STM.STM<R, E, A>): STM.STM<R, E, void>
  <A, R, E>(index: number, f: (value: A) => STM.STM<R, E, A>): (self: TArray<A>) => STM.STM<R, E, void>
} = internal.updateSTM
