import * as Debug from "@effect/io/Debug"
import * as core from "@effect/stm/internal_effect_untraced/core"
import * as tRef from "@effect/stm/internal_effect_untraced/tRef"
import type * as STM from "@effect/stm/STM"
import type * as TPriorityQueue from "@effect/stm/TPriorityQueue"
import type * as TRef from "@effect/stm/TRef"
import { pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import type { Predicate } from "@fp-ts/core/Predicate"
import * as ReadonlyArray from "@fp-ts/core/ReadonlyArray"
import type * as Order from "@fp-ts/core/typeclass/Order"
import * as Chunk from "@effect/data/Chunk"
import * as SortedMap from "@effect/data/SortedMap"

/** @internal */
const TPriorityQueueSymbolKey = "@effect/stm/TPriorityQueue"

/** @internal */
export const TPriorityQueueTypeId: TPriorityQueue.TPriorityQueueTypeId = Symbol.for(
  TPriorityQueueSymbolKey
) as TPriorityQueue.TPriorityQueueTypeId

/** @internal */
const tPriorityQueueVariance = {
  _A: (_: never) => _
}

/** @internal */
export class TPriorityQueueImpl<A> implements TPriorityQueue.TPriorityQueue<A> {
  readonly [TPriorityQueueTypeId] = tPriorityQueueVariance
  constructor(readonly ref: TRef.TRef<SortedMap.SortedMap<A, [A, ...Array<A>]>>) {}
}

/** @internal */
export const empty = Debug.methodWithTrace((trace) =>
  <A>(order: Order.Order<A>): STM.STM<never, never, TPriorityQueue.TPriorityQueue<A>> =>
    pipe(
      tRef.make(SortedMap.empty<A, [A, ...Array<A>]>(order)),
      core.map((ref) => new TPriorityQueueImpl(ref))
    ).traced(trace)
)

/** @internal */
export const fromIterable = Debug.methodWithTrace((trace) =>
  <A>(order: Order.Order<A>) =>
    (iterable: Iterable<A>): STM.STM<never, never, TPriorityQueue.TPriorityQueue<A>> =>
      pipe(
        tRef.make(
          Array.from(iterable).reduce(
            (map, value) =>
              pipe(
                map,
                SortedMap.set(
                  value,
                  pipe(
                    map,
                    SortedMap.get(value),
                    Option.match(() => ReadonlyArray.of(value), ReadonlyArray.prepend(value))
                  )
                )
              ),
            SortedMap.empty<A, [A, ...Array<A>]>(order)
          )
        ),
        core.map((ref) => new TPriorityQueueImpl(ref))
      ).traced(trace)
)

/** @internal */
export const isEmpty = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, boolean> =>
    core.map(tRef.get(self.ref), SortedMap.isEmpty).traced(trace)
)

/** @internal */
export const isNonEmpty = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, boolean> =>
    core.map(tRef.get(self.ref), SortedMap.isNonEmpty).traced(trace)
)

/** @internal */
export const make = Debug.methodWithTrace((trace) =>
  <A>(order: Order.Order<A>) =>
    (...elements: Array<A>): STM.STM<never, never, TPriorityQueue.TPriorityQueue<A>> =>
      fromIterable(order)(elements).traced(trace)
)

/** @internal */
export const offer = Debug.dualWithTrace<
  <A>(self: TPriorityQueue.TPriorityQueue<A>, value: A) => STM.STM<never, never, void>,
  <A>(value: A) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>
>(2, (trace) =>
  (self, value) =>
    tRef.update(self.ref, (map) =>
      SortedMap.set(
        map,
        value,
        pipe(
          SortedMap.get(map, value),
          Option.match(() => ReadonlyArray.of(value), ReadonlyArray.prepend(value))
        )
      )).traced(trace))

/** @internal */
export const offerAll = Debug.dualWithTrace<
  <A>(self: TPriorityQueue.TPriorityQueue<A>, values: Iterable<A>) => STM.STM<never, never, void>,
  <A>(values: Iterable<A>) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>
>(2, (trace) =>
  (self, values) =>
    tRef.update(self.ref, (map) =>
      Array.from(values).reduce(
        (map, value) =>
          SortedMap.set(
            map,
            value,
            pipe(
              SortedMap.get(map, value),
              Option.match(() => ReadonlyArray.of(value), ReadonlyArray.prepend(value))
            )
          ),
        map
      )).traced(trace))

/** @internal */
export const peek = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, A> =>
    core.withSTMRuntime((runtime) => {
      const map = tRef.unsafeGet(self.ref, runtime.journal)
      return pipe(
        SortedMap.headOption(map),
        Option.match(core.retry, (elements) => core.succeed(elements[0]))
      )
    }).traced(trace)
)

/** @internal */
export const peekOption = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Option.Option<A>> =>
    tRef.modify(self.ref, (map) => [
      pipe(SortedMap.headOption(map), Option.map((elements) => elements[0])),
      map
    ]).traced(trace)
)

/** @internal */
export const removeIf = Debug.dualWithTrace<
  <A>(self: TPriorityQueue.TPriorityQueue<A>, predicate: Predicate<A>) => STM.STM<never, never, void>,
  <A>(predicate: Predicate<A>) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>
>(2, (trace, restore) => (self, predicate) => retainIf(self, (a) => !restore(predicate)(a)).traced(trace))

/** @internal */
export const retainIf = Debug.dualWithTrace<
  <A>(self: TPriorityQueue.TPriorityQueue<A>, predicate: Predicate<A>) => STM.STM<never, never, void>,
  <A>(predicate: Predicate<A>) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>
>(
  2,
  (trace, restore) =>
    <A>(self: TPriorityQueue.TPriorityQueue<A>, predicate: Predicate<A>) =>
      tRef.update(
        self.ref,
        (map) =>
          SortedMap.reduceWithIndex(map, SortedMap.empty(SortedMap.getOrder(map)), (map, value, key) => {
            const filtered: ReadonlyArray<A> = pipe(value, ReadonlyArray.filter(restore(predicate)))
            return filtered.length > 0 ?
              SortedMap.set(map, key, filtered as [A, ...Array<A>]) :
              SortedMap.remove(map, key)
          })
      ).traced(trace)
)

/** @internal */
export const size = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, number> =>
    tRef.modify(
      self.ref,
      (map) => [SortedMap.reduce(map, 0, (n, as) => n + as.length), map]
    ).traced(trace)
)

/** @internal */
export const take = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, A> =>
    core.withSTMRuntime((runtime) => {
      const map = tRef.unsafeGet(self.ref, runtime.journal)
      return pipe(
        SortedMap.headOption(map),
        Option.match(
          core.retry,
          (values) => {
            const head = values[1][0]
            const tail = values[1].slice(1)
            tRef.unsafeSet(
              self.ref,
              tail.length > 0 ?
                SortedMap.set(map, head, tail as [A, ...Array<A>]) :
                SortedMap.remove(map, head),
              runtime.journal
            )
            return core.succeed(head)
          }
        )
      )
    }).traced(trace)
)

/** @internal */
export const takeAll = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Chunk.Chunk<A>> =>
    tRef.modify(self.ref, (map) => {
      const builder: Array<A> = []
      for (const entry of map) {
        builder.push(...entry[1])
      }
      return [Chunk.unsafeFromArray(builder), SortedMap.empty(SortedMap.getOrder(map))]
    }).traced(trace)
)

/** @internal */
export const takeOption = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Option.Option<A>> =>
    core.effect<never, Option.Option<A>>((journal) => {
      const map = pipe(self.ref, tRef.unsafeGet(journal))
      return pipe(
        SortedMap.headOption(map),
        Option.match(
          (): Option.Option<A> => Option.none(),
          ([key, value]) => {
            const tail = value.slice(1)
            tRef.unsafeSet(
              self.ref,
              tail.length > 0 ?
                SortedMap.set(map, key, tail as [A, ...Array<A>]) :
                SortedMap.remove(map, key),
              journal
            )
            return Option.some(value[0])
          }
        )
      )
    }).traced(trace)
)

/** @internal */
export const takeUpTo = Debug.dualWithTrace<
  <A>(self: TPriorityQueue.TPriorityQueue<A>, n: number) => STM.STM<never, never, Chunk.Chunk<A>>,
  (n: number) => <A>(self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, Chunk.Chunk<A>>
>(2, (trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>, n: number) =>
    tRef.modify(self.ref, (map) => {
      const builder: Array<A> = []
      const iterator = map[Symbol.iterator]()
      let updated = map
      let index = 0
      let next: IteratorResult<readonly [A, [A, ...Array<A>]], any>
      while ((next = iterator.next()) && !next.done && index < n) {
        const [key, value] = next.value
        const [left, right] = pipe(value, ReadonlyArray.splitAt(n - index))
        builder.push(...left)
        if (right.length > 0) {
          updated = SortedMap.set(updated, key, right as [A, ...Array<A>])
        } else {
          updated = SortedMap.remove(updated, key)
        }
        index = index + left.length
      }
      return [Chunk.unsafeFromArray(builder), updated]
    }).traced(trace))

/** @internal */
export const toChunk = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Chunk.Chunk<A>> =>
    tRef.modify(self.ref, (map) => {
      const builder: Array<A> = []
      for (const entry of map) {
        builder.push(...entry[1])
      }
      return [Chunk.unsafeFromArray(builder), map]
    }).traced(trace)
)

/** @internal */
export const toReadonlyArray = Debug.methodWithTrace((trace) =>
  <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, ReadonlyArray<A>> =>
    tRef.modify(self.ref, (map) => {
      const builder: Array<A> = []
      for (const entry of map) {
        builder.push(...entry[1])
      }
      return [builder, map]
    }).traced(trace)
)
