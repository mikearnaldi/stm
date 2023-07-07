import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Either from "@effect/data/Either"
import type { LazyArg } from "@effect/data/Function"
import { constFalse, constTrue, constVoid, dual, identity, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import type { Predicate } from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as effectCore from "@effect/io/internal/core"
import * as SingleShotGen from "@effect/io/internal/singleShotGen"
import * as core from "@effect/stm/internal_effect_untraced/core"
import * as Journal from "@effect/stm/internal_effect_untraced/stm/journal"
import * as STMState from "@effect/stm/internal_effect_untraced/stm/stmState"
import type * as STM from "@effect/stm/STM"

/** @internal */
export const absolve = <R, E, E2, A>(self: STM.STM<R, E, Either.Either<E2, A>>): STM.STM<R, E | E2, A> =>
  core.flatMap(self, fromEither)

/** @internal */
export const acquireUseRelease = dual<
  <A, R2, E2, A2, R3, E3, A3>(
    use: (resource: A) => STM.STM<R2, E2, A2>,
    release: (resource: A) => STM.STM<R3, E3, A3>
  ) => <R, E>(
    acquire: STM.STM<R, E, A>
  ) => Effect.Effect<R | R2 | R3, E | E2 | E3, A2>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    acquire: STM.STM<R, E, A>,
    use: (resource: A) => STM.STM<R2, E2, A2>,
    release: (resource: A) => STM.STM<R3, E3, A3>
  ) => Effect.Effect<R | R2 | R3, E | E2 | E3, A2>
>(3, <R, E, A, R2, E2, A2, R3, E3, A3>(
  acquire: STM.STM<R, E, A>,
  use: (resource: A) => STM.STM<R2, E2, A2>,
  release: (resource: A) => STM.STM<R3, E3, A3>
): Effect.Effect<R | R2 | R3, E | E2 | E3, A2> =>
  Effect.uninterruptibleMask((restore) => {
    let state: STMState.STMState<E, A> = STMState.running
    return pipe(
      restore(
        core.unsafeAtomically(
          acquire,
          (exit) => {
            state = STMState.done(exit)
          },
          () => {
            state = STMState.interrupted
          }
        )
      ),
      Effect.matchCauseEffect({
        onFailure: (cause) => {
          if (STMState.isDone(state) && Exit.isSuccess(state.exit)) {
            return pipe(
              release(state.exit.value),
              Effect.matchCauseEffect({
                onFailure: (cause2) => Effect.failCause(Cause.parallel(cause, cause2)),
                onSuccess: () => Effect.failCause(cause)
              })
            )
          }
          return Effect.failCause(cause)
        },
        onSuccess: (a) =>
          pipe(
            restore(use(a)),
            Effect.matchCauseEffect({
              onFailure: (cause) =>
                pipe(
                  release(a),
                  Effect.matchCauseEffect({
                    onFailure: (cause2) => Effect.failCause(Cause.parallel(cause, cause2)),
                    onSuccess: () => Effect.failCause(cause)
                  })
                ),
              onSuccess: (a2) => pipe(release(a), Effect.as(a2))
            })
          )
      })
    )
  }))

/** @internal */
export const as = dual<
  <A2>(value: A2) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, A2>,
  <R, E, A, A2>(self: STM.STM<R, E, A>, value: A2) => STM.STM<R, E, A2>
>(2, (self, value) => pipe(self, core.map(() => value)))

/** @internal */
export const asSome = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, E, Option.Option<A>> =>
  pipe(self, core.map(Option.some))

/** @internal */
export const asSomeError = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, Option.Option<E>, A> =>
  pipe(self, mapError(Option.some))

/** @internal */
export const asUnit = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, E, void> => pipe(self, core.map(constVoid))

/** @internal */
export const attempt = <A>(evaluate: LazyArg<A>): STM.STM<never, unknown, A> =>
  suspend(() => {
    try {
      return core.succeed(evaluate())
    } catch (defect) {
      return core.fail(defect)
    }
  })

export const bind = dual<
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM.STM<R2, E2, A>
  ) => <R, E>(self: STM.STM<R, E, K>) => STM.STM<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, N extends string, K, R2, E2, A>(
    self: STM.STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM.STM<R2, E2, A>
  ) => STM.STM<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, N extends string, K, R2, E2, A>(
  self: STM.STM<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => STM.STM<R2, E2, A>
) =>
  core.flatMap(self, (k) =>
    core.map(
      f(k),
      (a): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    )))

/* @internal */
export const bindTo = dual<
  <N extends string>(tag: N) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<
    R,
    E,
    Record<N, A>
  >,
  <R, E, A, N extends string>(
    self: STM.STM<R, E, A>,
    tag: N
  ) => STM.STM<
    R,
    E,
    Record<N, A>
  >
>(
  2,
  <R, E, A, N extends string>(self: STM.STM<R, E, A>, tag: N): STM.STM<R, E, Record<N, A>> =>
    core.map(self, (a) => ({ [tag]: a } as Record<N, A>))
)

/* @internal */
export const let_ = dual<
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => <R, E>(self: STM.STM<R, E, K>) => STM.STM<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, K, N extends string, A>(
    self: STM.STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => STM.STM<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, K, N extends string, A>(self: STM.STM<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A) =>
  core.map(
    self,
    (k): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: f(k) } as any)
  ))

/** @internal */
export const catchSome = dual<
  <E, R2, E2, A2>(
    pf: (error: E) => Option.Option<STM.STM<R2, E2, A2>>
  ) => <R, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E | E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    pf: (error: E) => Option.Option<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E | E2, A2 | A>
>(2, <R, A, E, R2, E2, A2>(
  self: STM.STM<R, E, A>,
  pf: (error: E) => Option.Option<STM.STM<R2, E2, A2>>
): STM.STM<R2 | R, E | E2, A2 | A> =>
  core.catchAll(
    self,
    (e): STM.STM<R | R2, E | E2, A | A2> => Option.getOrElse(pf(e), () => core.fail(e))
  ))

/** @internal */
export const check = (predicate: LazyArg<boolean>): STM.STM<never, never, void> =>
  suspend(() => predicate() ? unit() : core.retry())

/** @internal */
export const collect = dual<
  <A, A2>(pf: (a: A) => Option.Option<A2>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A2>,
  <R, E, A, A2>(self: STM.STM<R, E, A>, pf: (a: A) => Option.Option<A2>) => STM.STM<R, E, A2>
>(2, (self, pf) =>
  collectSTM(
    self,
    (a) => Option.map(pf(a), core.succeed)
  ))

/** @internal */
export const collectAll = <R, E, A>(iterable: Iterable<STM.STM<R, E, A>>): STM.STM<R, E, Array<A>> =>
  forEach(iterable, identity)

/** @internal */
export const collectAllDiscard = <R, E, A>(iterable: Iterable<STM.STM<R, E, A>>): STM.STM<R, E, void> =>
  pipe(iterable, forEachDiscard(identity))

/** @internal */
export const collectFirst = dual<
  <A, R, E, A2>(
    pf: (a: A) => STM.STM<R, E, Option.Option<A2>>
  ) => (
    iterable: Iterable<A>
  ) => STM.STM<R, E, Option.Option<A2>>,
  <A, R, E, A2>(
    iterable: Iterable<A>,
    pf: (a: A) => STM.STM<R, E, Option.Option<A2>>
  ) => STM.STM<R, E, Option.Option<A2>>
>(2, <A, R, E, A2>(
  iterable: Iterable<A>,
  pf: (a: A) => STM.STM<R, E, Option.Option<A2>>
): STM.STM<R, E, Option.Option<A2>> =>
  pipe(
    core.sync(() => iterable[Symbol.iterator]()),
    core.flatMap((iterator) => {
      const loop: STM.STM<R, E, Option.Option<A2>> = suspend(() => {
        const next = iterator.next()
        if (next.done) {
          return succeedNone()
        }
        return pipe(
          pf(next.value),
          core.flatMap(Option.match({
            onNone: () => loop,
            onSome: succeedSome
          }))
        )
      })
      return loop
    })
  ))

/** @internal */
export const collectSTM = dual<
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<STM.STM<R2, E2, A2>>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    pf: (a: A) => Option.Option<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2 | E, A2>
>(2, (self, pf) =>
  core.matchSTM(self, core.fail, (a) => {
    const option = pf(a)
    return Option.isSome(option) ? option.value : core.retry()
  }))

/** @internal */
export const commitEither = <R, E, A>(self: STM.STM<R, E, A>): Effect.Effect<R, E, A> =>
  Effect.flatten(core.commit(either(self)))

/** @internal */
export const cond = <E, A>(
  predicate: LazyArg<boolean>,
  error: LazyArg<E>,
  result: LazyArg<A>
): STM.STM<never, E, A> => {
  return suspend(
    () => predicate() ? core.sync(result) : core.failSync(error)
  )
}

/** @internal */
export const either = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, Either.Either<E, A>> =>
  match(self, Either.left, Either.right)

/** @internal */
export const eventually = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, E, A> =>
  core.matchSTM(self, () => eventually(self), core.succeed)

/** @internal */
export const every = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, boolean>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, boolean>
>(
  2,
  <A, R, E>(
    iterable: Iterable<A>,
    predicate: (a: A) => STM.STM<R, E, boolean>
  ): STM.STM<R, E, boolean> =>
    pipe(
      core.flatMap(core.sync(() => iterable[Symbol.iterator]()), (iterator) => {
        const loop: STM.STM<R, E, boolean> = suspend(() => {
          const next = iterator.next()
          if (next.done) {
            return core.succeed(true)
          }
          return pipe(
            predicate(next.value),
            core.flatMap((bool) => bool ? loop : core.succeed(bool))
          )
        })
        return loop
      })
    )
)

/** @internal */
export const exists = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, boolean>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, boolean>
>(
  2,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>): STM.STM<R, E, boolean> =>
    core.flatMap(core.sync(() => iterable[Symbol.iterator]()), (iterator) => {
      const loop: STM.STM<R, E, boolean> = suspend(() => {
        const next = iterator.next()
        if (next.done) {
          return core.succeed(false)
        }
        return core.flatMap(
          predicate(next.value),
          (bool) => bool ? core.succeed(bool) : loop
        )
      })
      return loop
    })
)

/** @internal */
export const fiberId = (): STM.STM<never, never, FiberId.FiberId> =>
  core.effect<never, FiberId.FiberId>((_, fiberId) => fiberId)

/** @internal */
export const filter = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, Array<A>>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, Array<A>>
>(
  2,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Array<A>> =>
    Array.from(iterable).reduce(
      (acc, curr) =>
        pipe(
          acc,
          core.zipWith(predicate(curr), (as, p) => {
            if (p) {
              as.push(curr)
              return as
            }
            return as
          })
        ),
      core.succeed([]) as STM.STM<R, E, Array<A>>
    )
)

/** @internal */
export const filterNot = dual<
  <A, R, E>(predicate: (a: A) => STM.STM<R, E, boolean>) => (iterable: Iterable<A>) => STM.STM<R, E, Array<A>>,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>) => STM.STM<R, E, Array<A>>
>(
  2,
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM.STM<R, E, boolean>): STM.STM<R, E, Array<A>> =>
    filter(iterable, (a) => negate(predicate(a)))
)

/** @internal */
export const filterOrDie = dual<
  <A>(predicate: Predicate<A>, defect: LazyArg<unknown>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>, defect: LazyArg<unknown>) => STM.STM<R, E, A>
>(
  3,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>, defect: LazyArg<unknown>): STM.STM<R, E, A> =>
    filterOrElse(self, predicate, () => core.dieSync(defect))
)

/** @internal */
export const filterOrDieMessage = dual<
  <A>(predicate: Predicate<A>, message: string) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>, message: string) => STM.STM<R, E, A>
>(
  3,
  (self, predicate, message) => filterOrElse(self, predicate, () => core.dieMessage(message))
)

/** @internal */
export const filterOrElse = dual<
  <A, R2, E2, A2>(
    predicate: Predicate<A>,
    orElse: LazyArg<STM.STM<R2, E2, A2>>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    predicate: Predicate<A>,
    orElse: LazyArg<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2 | E, A | A2>
>(
  3,
  (self, predicate, orElse) => filterOrElseWith(self, predicate, orElse)
)

/** @internal */
export const filterOrElseWith = dual<
  <A, R2, E2, A2>(
    predicate: Predicate<A>,
    orElse: (a: A) => STM.STM<R2, E2, A2>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    predicate: Predicate<A>,
    orElse: (a: A) => STM.STM<R2, E2, A2>
  ) => STM.STM<R2 | R, E2 | E, A | A2>
>(
  3,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    predicate: Predicate<A>,
    orElse: (a: A) => STM.STM<R2, E2, A2>
  ): STM.STM<R2 | R, E2 | E, A | A2> =>
    core.flatMap(self, (a): STM.STM<R | R2, E | E2, A | A2> =>
      predicate(a) ?
        core.succeed(a) :
        orElse(a))
)

/** @internal */
export const filterOrFail = dual<
  <A, E2>(predicate: Predicate<A>, error: LazyArg<E2>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E2 | E, A>,
  <R, E, A, E2>(self: STM.STM<R, E, A>, predicate: Predicate<A>, error: LazyArg<E2>) => STM.STM<R, E2 | E, A>
>(3, (self, predicate, error) =>
  filterOrElse(
    self,
    predicate,
    () => core.failSync(error)
  ))

/** @internal */
export const flatMapError = dual<
  <E, R2, E2>(f: (error: E) => STM.STM<R2, never, E2>) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E2, A>,
  <R, A, E, R2, E2>(self: STM.STM<R, E, A>, f: (error: E) => STM.STM<R2, never, E2>) => STM.STM<R2 | R, E2, A>
>(2, (self, f) =>
  core.matchSTM(
    self,
    (e) => flip(f(e)),
    core.succeed
  ))

/** @internal */
export const flatten = <R, E, R2, E2, A>(self: STM.STM<R, E, STM.STM<R2, E2, A>>): STM.STM<R | R2, E | E2, A> =>
  core.flatMap(self, identity)

/** @internal */
export const flattenErrorOption = dual<
  <E2>(fallback: LazyArg<E2>) => <R, E, A>(self: STM.STM<R, Option.Option<E>, A>) => STM.STM<R, E2 | E, A>,
  <R, E, A, E2>(self: STM.STM<R, Option.Option<E>, A>, fallback: LazyArg<E2>) => STM.STM<R, E2 | E, A>
>(2, (self, fallback) => mapError(self, Option.getOrElse(fallback)))

/** @internal */
export const flip = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, A, E> => core.matchSTM(self, core.succeed, core.fail)

/** @internal */
export const flipWith = dual<
  <R, A, E, R2, A2, E2>(
    f: (stm: STM.STM<R, A, E>) => STM.STM<R2, A2, E2>
  ) => (
    self: STM.STM<R, E, A>
  ) => STM.STM<R | R2, E | E2, A | A2>,
  <R, A, E, R2, A2, E2>(
    self: STM.STM<R, E, A>,
    f: (stm: STM.STM<R, A, E>) => STM.STM<R2, A2, E2>
  ) => STM.STM<R | R2, E | E2, A | A2>
>(2, (self, f) => flip(f(flip(self))))

/** @internal */
export const match = dual<
  <E, A2, A, A3>(f: (error: E) => A2, g: (value: A) => A3) => <R>(self: STM.STM<R, E, A>) => STM.STM<R, never, A2 | A3>,
  <R, E, A2, A, A3>(self: STM.STM<R, E, A>, f: (error: E) => A2, g: (value: A) => A3) => STM.STM<R, never, A2 | A3>
>(3, (self, f, g) =>
  core.matchSTM(
    self,
    (e) => core.succeed(f(e)),
    (a) => core.succeed(g(a))
  ))

/** @internal */
export const forEach = dual<
  <A, R, E, A2>(f: (a: A) => STM.STM<R, E, A2>) => (elements: Iterable<A>) => STM.STM<R, E, Array<A2>>,
  <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM.STM<R, E, A2>) => STM.STM<R, E, Array<A2>>
>(
  2,
  <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM.STM<R, E, A2>): STM.STM<R, E, Array<A2>> =>
    suspend(() =>
      Array.from(elements).reduce(
        (acc, curr) =>
          pipe(
            acc,
            core.zipWith(f(curr), (array, elem) => {
              array.push(elem)
              return array
            })
          ),
        core.succeed([]) as STM.STM<R, E, Array<A2>>
      )
    )
)

/** @internal */
export const forEachDiscard = dual<
  <A, R, E, _>(f: (a: A) => STM.STM<R, E, _>) => (iterable: Iterable<A>) => STM.STM<R, E, void>,
  <A, R, E, _>(iterable: Iterable<A>, f: (a: A) => STM.STM<R, E, _>) => STM.STM<R, E, void>
>(
  2,
  <A, R, E, _>(iterable: Iterable<A>, f: (a: A) => STM.STM<R, E, _>): STM.STM<R, E, void> =>
    pipe(
      core.sync(() => iterable[Symbol.iterator]()),
      core.flatMap((iterator) => {
        const loop: STM.STM<R, E, void> = suspend(() => {
          const next = iterator.next()
          if (next.done) {
            return unit()
          }
          return pipe(f(next.value), core.flatMap(() => loop))
        })
        return loop
      })
    )
)

/** @internal */
export const fromEither = <E, A>(either: Either.Either<E, A>): STM.STM<never, E, A> => {
  switch (either._tag) {
    case "Left": {
      return core.fail(either.left)
    }
    case "Right": {
      return core.succeed(either.right)
    }
  }
}

/** @internal */
export const fromOption = <A>(option: Option.Option<A>): STM.STM<never, Option.Option<never>, A> =>
  Option.match(option, {
    onNone: () => core.fail(Option.none()),
    onSome: core.succeed
  })

/** @internal */
class STMGen {
  constructor(readonly value: STM.STM<any, any, any>) {}
  [Symbol.iterator]() {
    return new SingleShotGen.SingleShotGen(this)
  }
}

const adapter = function() {
  let x = arguments[0]
  for (let i = 1; i < arguments.length; i++) {
    x = arguments[i](x)
  }
  return new STMGen(x) as any
}

/**
 * Inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 * @internal
 */
export const gen: typeof STM.gen = (f) =>
  suspend(() => {
    const iterator = f(adapter)
    const state = iterator.next()
    const run = (
      state: IteratorYieldResult<any> | IteratorReturnResult<any>
    ): STM.STM<any, any, any> =>
      state.done ?
        core.succeed(state.value) :
        core.flatMap(
          state.value.value as unknown as STM.STM<any, any, any>,
          (val: any) => run(iterator.next(val))
        )
    return run(state)
  })

/** @internal */
export const head = <R, E, A>(self: STM.STM<R, E, Iterable<A>>): STM.STM<R, Option.Option<E>, A> =>
  pipe(
    self,
    core.matchSTM(
      (e) => core.fail(Option.some(e)),
      (a) => {
        const i = a[Symbol.iterator]()
        const res = i.next()
        if (res.done) {
          return core.fail(Option.none())
        } else {
          return core.succeed(res.value)
        }
      }
    )
  )

/** @internal */
export const ifSTM = dual<
  <R1, R2, E1, E2, A, A1>(
    onTrue: STM.STM<R1, E1, A>,
    onFalse: STM.STM<R2, E2, A1>
  ) => <R, E>(
    self: STM.STM<R, E, boolean>
  ) => STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1>,
  <R, E, R1, R2, E1, E2, A, A1>(
    self: STM.STM<R, E, boolean>,
    onTrue: STM.STM<R1, E1, A>,
    onFalse: STM.STM<R2, E2, A1>
  ) => STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1>
>(
  3,
  <R, E, R1, R2, E1, E2, A, A1>(
    self: STM.STM<R, E, boolean>,
    onTrue: STM.STM<R1, E1, A>,
    onFalse: STM.STM<R2, E2, A1>
  ): STM.STM<R1 | R2 | R, E1 | E2 | E, A | A1> =>
    core.flatMap(self, (bool): STM.STM<R1 | R2, E1 | E2, A | A1> => bool ? onTrue : onFalse)
)

/** @internal */
export const ignore = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, void> => match(self, unit, unit)

/** @internal */
export const isFailure = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, boolean> =>
  match(self, constTrue, constFalse)

/** @internal */
export const isSuccess = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, boolean> =>
  match(self, constFalse, constTrue)

/** @internal */
export const iterate = <R, E, Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  body: (z: Z) => STM.STM<R, E, Z>
): STM.STM<R, E, Z> => {
  return iterateLoop(initial, cont, body)
}

const iterateLoop = <R, E, Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  body: (z: Z) => STM.STM<R, E, Z>
): STM.STM<R, E, Z> => {
  if (cont(initial)) {
    return pipe(
      body(initial),
      core.flatMap((z) => iterateLoop(z, cont, body))
    )
  }
  return core.succeed(initial)
}

/** @internal */
export const left = <R, E, A, A2>(self: STM.STM<R, E, Either.Either<A, A2>>): STM.STM<R, Either.Either<E, A2>, A> =>
  core.matchSTM(
    self,
    (e) => core.fail(Either.left(e)),
    Either.match({
      onLeft: core.succeed,
      onRight: (a2) => core.fail(Either.right(a2))
    })
  )

/** @internal */
export const loop = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM.STM<R, E, A>
): STM.STM<R, E, Array<A>> => {
  return core.map(loopLoop(initial, cont, inc, body), (a) => Array.from(a))
}

const loopLoop = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM.STM<R, E, A>
): STM.STM<R, E, Chunk.Chunk<A>> => {
  if (cont(initial)) {
    return pipe(
      body(initial),
      core.flatMap((a) => pipe(loopLoop(inc(initial), cont, inc, body), core.map(Chunk.append(a))))
    )
  }
  return core.succeed(Chunk.empty<A>())
}

/** @internal */
export const loopDiscard = <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM.STM<R, E, X>
): STM.STM<R, E, void> => {
  return loopDiscardLoop(initial, cont, inc, body)
}

const loopDiscardLoop = <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM.STM<R, E, X>
): STM.STM<R, E, void> => {
  if (cont(initial)) {
    return pipe(
      body(initial),
      core.flatMap(() => loopDiscardLoop(inc(initial), cont, inc, body))
    )
  }
  return unit()
}

/** @internal */
export const mapAttempt = dual<
  <A, B>(f: (a: A) => B) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, unknown, B>,
  <R, E, A, B>(self: STM.STM<R, E, A>, f: (a: A) => B) => STM.STM<R, unknown, B>
>(2, <R, E, A, B>(self: STM.STM<R, E, A>, f: (a: A) => B): STM.STM<R, unknown, B> =>
  core.matchSTM(
    self,
    (e) => core.fail(e),
    (a) => attempt(() => f(a))
  ))

/** @internal */
export const mapBoth = dual<
  <E, E2, A, A2>(f: (error: E) => E2, g: (value: A) => A2) => <R>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A2>,
  <R, E, E2, A, A2>(self: STM.STM<R, E, A>, f: (error: E) => E2, g: (value: A) => A2) => STM.STM<R, E2, A2>
>(3, (self, f, g) =>
  core.matchSTM(
    self,
    (e) => core.fail(f(e)),
    (a) => core.succeed(g(a))
  ))

/** @internal */
export const mapError = dual<
  <E, E2>(f: (error: E) => E2) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A>,
  <R, A, E, E2>(self: STM.STM<R, E, A>, f: (error: E) => E2) => STM.STM<R, E2, A>
>(2, (self, f) =>
  core.matchSTM(
    self,
    (e) => core.fail(f(e)),
    core.succeed
  ))

/** @internal */
export const merge = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, E | A> =>
  core.matchSTM(self, (e) => core.succeed(e), core.succeed)

/** @internal */
export const mergeAll = dual<
  <A2, A>(zero: A2, f: (a2: A2, a: A) => A2) => <R, E>(iterable: Iterable<STM.STM<R, E, A>>) => STM.STM<R, E, A2>,
  <R, E, A2, A>(iterable: Iterable<STM.STM<R, E, A>>, zero: A2, f: (a2: A2, a: A) => A2) => STM.STM<R, E, A2>
>(
  3,
  <R, E, A2, A>(iterable: Iterable<STM.STM<R, E, A>>, zero: A2, f: (a2: A2, a: A) => A2): STM.STM<R, E, A2> =>
    suspend(() =>
      Array.from(iterable).reduce(
        (acc, curr) => pipe(acc, core.zipWith(curr, f)),
        core.succeed(zero) as STM.STM<R, E, A2>
      )
    )
)

/** @internal */
export const negate = <R, E>(self: STM.STM<R, E, boolean>): STM.STM<R, E, boolean> => pipe(self, core.map((b) => !b))

/** @internal */
export const none = <R, E, A>(self: STM.STM<R, E, Option.Option<A>>): STM.STM<R, Option.Option<E>, void> =>
  core.matchSTM(
    self,
    (e) => core.fail(Option.some(e)),
    Option.match({
      onNone: unit,
      onSome: () => core.fail(Option.none())
    })
  )

/** @internal */
export const option = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, Option.Option<A>> =>
  match(self, () => Option.none(), Option.some)

/** @internal */
export const orDie = <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R, never, A> => pipe(self, orDieWith(identity))

/** @internal */
export const orDieWith = dual<
  <E>(f: (error: E) => unknown) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R, never, A>,
  <R, A, E>(self: STM.STM<R, E, A>, f: (error: E) => unknown) => STM.STM<R, never, A>
>(2, (self, f) => pipe(self, mapError(f), core.catchAll(core.die)))

/** @internal */
export const orElse = dual<
  <R2, E2, A2>(that: LazyArg<STM.STM<R2, E2, A2>>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E2, A2 | A>,
  <R, E, A, R2, E2, A2>(self: STM.STM<R, E, A>, that: LazyArg<STM.STM<R2, E2, A2>>) => STM.STM<R2 | R, E2, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(self: STM.STM<R, E, A>, that: LazyArg<STM.STM<R2, E2, A2>>): STM.STM<R2 | R, E2, A2 | A> =>
    core.flatMap(core.effect<R, LazyArg<void>>((journal) => Journal.prepareResetJournal(journal)), (reset) =>
      pipe(
        core.orTry(self, () => core.flatMap(core.sync(reset), that)),
        core.catchAll(() => core.flatMap(core.sync(reset), that))
      ))
)

/** @internal */
export const orElseEither = dual<
  <R2, E2, A2>(
    that: LazyArg<STM.STM<R2, E2, A2>>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2, Either.Either<A, A2>>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    that: LazyArg<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2, Either.Either<A, A2>>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    that: LazyArg<STM.STM<R2, E2, A2>>
  ): STM.STM<R2 | R, E2, Either.Either<A, A2>> =>
    orElse(core.map(self, Either.left), () => core.map(that(), Either.right))
)

/** @internal */
export const orElseFail = dual<
  <E2>(error: LazyArg<E2>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A>,
  <R, E, A, E2>(self: STM.STM<R, E, A>, error: LazyArg<E2>) => STM.STM<R, E2, A>
>(
  2,
  <R, E, A, E2>(self: STM.STM<R, E, A>, error: LazyArg<E2>): STM.STM<R, E2, A> =>
    orElse(self, () => core.failSync(error))
)

/** @internal */
export const orElseOptional = dual<
  <R2, E2, A2>(
    that: LazyArg<STM.STM<R2, Option.Option<E2>, A2>>
  ) => <R, E, A>(
    self: STM.STM<R, Option.Option<E>, A>
  ) => STM.STM<R2 | R, Option.Option<E2 | E>, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, Option.Option<E>, A>,
    that: LazyArg<STM.STM<R2, Option.Option<E2>, A2>>
  ) => STM.STM<R2 | R, Option.Option<E2 | E>, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, Option.Option<E>, A>,
    that: LazyArg<STM.STM<R2, Option.Option<E2>, A2>>
  ): STM.STM<R2 | R, Option.Option<E2 | E>, A2 | A> =>
    core.catchAll(
      self,
      Option.match({
        onNone: that,
        onSome: (e) => core.fail(Option.some<E | E2>(e))
      })
    )
)

/** @internal */
export const orElseSucceed = dual<
  <A2>(value: LazyArg<A2>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, never, A2 | A>,
  <R, E, A, A2>(self: STM.STM<R, E, A>, value: LazyArg<A2>) => STM.STM<R, never, A2 | A>
>(
  2,
  <R, E, A, A2>(self: STM.STM<R, E, A>, value: LazyArg<A2>): STM.STM<R, never, A2 | A> =>
    orElse(self, () => core.sync(value))
)

/** @internal */
export const provideContext = dual<
  <R>(env: Context.Context<R>) => <E, A>(self: STM.STM<R, E, A>) => STM.STM<never, E, A>,
  <E, A, R>(self: STM.STM<R, E, A>, env: Context.Context<R>) => STM.STM<never, E, A>
>(2, (self, env) => core.contramapContext(self, (_: Context.Context<never>) => env))

/** @internal */
export const provideSomeContext = dual<
  <R>(context: Context.Context<R>) => <R1, E, A>(self: STM.STM<R1, E, A>) => STM.STM<Exclude<R1, R>, E, A>,
  <R, R1, E, A>(self: STM.STM<R1, E, A>, context: Context.Context<R>) => STM.STM<Exclude<R1, R>, E, A>
>(2, <R, R1, E, A>(
  self: STM.STM<R1, E, A>,
  context: Context.Context<R>
): STM.STM<Exclude<R1, R>, E, A> =>
  core.contramapContext(
    self,
    (parent: Context.Context<Exclude<R1, R>>): Context.Context<R1> => Context.merge(parent, context) as any
  ))

/** @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: STM.STM<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ) => STM.STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>
>(3, (self, tag, resource) => provideServiceSTM(self, tag, core.succeed(resource)))

/** @internal */
export const provideServiceSTM = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    stm: STM.STM<R1, E1, Context.Tag.Service<T>>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>,
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: STM.STM<R, E, A>,
    tag: T,
    stm: STM.STM<R1, E1, Context.Tag.Service<T>>
  ) => STM.STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>
>(3, <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
  self: STM.STM<R, E, A>,
  tag: T,
  stm: STM.STM<R1, E1, Context.Tag.Service<T>>
): STM.STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A> =>
  core.contextWithSTM((env: Context.Context<R1 | Exclude<R, Context.Tag.Identifier<T>>>) =>
    core.flatMap(
      stm,
      (service) =>
        provideContext(
          self,
          Context.add(env, tag, service) as Context.Context<R | R1>
        )
    )
  ))

/** @internal */
export const reduce = dual<
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => (iterable: Iterable<A>) => STM.STM<R, E, S>,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => STM.STM<R, E, S>
>(
  3,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>): STM.STM<R, E, S> =>
    suspend(() =>
      Array.from(iterable).reduce(
        (acc, curr) => pipe(acc, core.flatMap((s) => f(s, curr))),
        core.succeed(zero) as STM.STM<R, E, S>
      )
    )
)

/** @internal */
export const reduceAll = dual<
  <R2, E2, A>(
    initial: STM.STM<R2, E2, A>,
    f: (x: A, y: A) => A
  ) => <R, E>(
    iterable: Iterable<STM.STM<R, E, A>>
  ) => STM.STM<R2 | R, E2 | E, A>,
  <R, E, R2, E2, A>(
    iterable: Iterable<STM.STM<R, E, A>>,
    initial: STM.STM<R2, E2, A>,
    f: (x: A, y: A) => A
  ) => STM.STM<R2 | R, E2 | E, A>
>(3, <R, E, R2, E2, A>(
  iterable: Iterable<STM.STM<R, E, A>>,
  initial: STM.STM<R2, E2, A>,
  f: (x: A, y: A) => A
): STM.STM<R2 | R, E2 | E, A> =>
  suspend(() =>
    Array.from(iterable).reduce(
      (acc, curr) => pipe(acc, core.zipWith(curr, f)),
      initial as STM.STM<R | R2, E | E2, A>
    )
  ))

/** @internal */
export const reduceRight = dual<
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => (iterable: Iterable<A>) => STM.STM<R, E, S>,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>) => STM.STM<R, E, S>
>(
  3,
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM.STM<R, E, S>): STM.STM<R, E, S> =>
    suspend(() =>
      Array.from(iterable).reduceRight(
        (acc, curr) => pipe(acc, core.flatMap((s) => f(s, curr))),
        core.succeed(zero) as STM.STM<R, E, S>
      )
    )
)

/** @internal */
export const refineOrDie = dual<
  <E, E2>(pf: (error: E) => Option.Option<E2>) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R, E2, A>,
  <R, A, E, E2>(self: STM.STM<R, E, A>, pf: (error: E) => Option.Option<E2>) => STM.STM<R, E2, A>
>(2, (self, pf) => refineOrDieWith(self, pf, identity))

/** @internal */
export const refineOrDieWith = dual<
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => <R, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R, E2, A>,
  <R, A, E, E2>(
    self: STM.STM<R, E, A>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => STM.STM<R, E2, A>
>(3, (self, pf, f) =>
  core.catchAll(
    self,
    (e) =>
      Option.match(pf(e), {
        onNone: () => core.die(f(e)),
        onSome: core.fail
      })
  ))

/** @internal */
export const reject = dual<
  <A, E2>(pf: (a: A) => Option.Option<E2>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E2 | E, A>,
  <R, E, A, E2>(self: STM.STM<R, E, A>, pf: (a: A) => Option.Option<E2>) => STM.STM<R, E2 | E, A>
>(2, (self, pf) =>
  rejectSTM(
    self,
    (a) => Option.map(pf(a), core.fail)
  ))

/** @internal */
export const rejectSTM = dual<
  <A, R2, E2>(
    pf: (a: A) => Option.Option<STM.STM<R2, E2, E2>>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2>(
    self: STM.STM<R, E, A>,
    pf: (a: A) => Option.Option<STM.STM<R2, E2, E2>>
  ) => STM.STM<R2 | R, E2 | E, A>
>(2, (self, pf) =>
  core.flatMap(self, (a) =>
    Option.match(pf(a), {
      onNone: () => core.succeed(a),
      onSome: core.flatMap(core.fail)
    })))

/** @internal */
export const repeatUntil = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(2, (self, predicate) => repeatUntilLoop(self, predicate))

const repeatUntilLoop = <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>): STM.STM<R, E, A> =>
  core.flatMap(self, (a) =>
    predicate(a) ?
      core.succeed(a) :
      repeatUntilLoop(self, predicate))

/** @internal */
export const repeatWhile = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(2, (self, predicate) => repeatWhileLoop(self, predicate))

const repeatWhileLoop = <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>): STM.STM<R, E, A> =>
  pipe(
    core.flatMap(self, (a) =>
      predicate(a) ?
        repeatWhileLoop(self, predicate) :
        core.succeed(a))
  )

/** @internal */
export const replicate = dual<
  (n: number) => <R, E, A>(self: STM.STM<R, E, A>) => Array<STM.STM<R, E, A>>,
  <R, E, A>(self: STM.STM<R, E, A>, n: number) => Array<STM.STM<R, E, A>>
>(2, (self, n) => Array.from({ length: n }, () => self))

/** @internal */
export const replicateSTM = dual<
  (n: number) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, Array<A>>,
  <R, E, A>(self: STM.STM<R, E, A>, n: number) => STM.STM<R, E, Array<A>>
>(2, (self, n) => pipe(self, replicate(n), collectAll))

/** @internal */
export const replicateSTMDiscard = dual<
  (n: number) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, void>,
  <R, E, A>(self: STM.STM<R, E, A>, n: number) => STM.STM<R, E, void>
>(2, (self, n) => pipe(self, replicate(n), collectAllDiscard))

/** @internal */
export const retryUntil = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(2, (self, predicate) =>
  collect(
    self,
    (a) => predicate(a) ? Option.some(a) : Option.none()
  ))

/** @internal */
export const retryWhile = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R, E, A>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: Predicate<A>) => STM.STM<R, E, A>
>(2, (self, predicate) =>
  collect(
    self,
    (a) => !predicate(a) ? Option.some(a) : Option.none()
  ))

/** @internal */
export const right = <R, E, A, A2>(self: STM.STM<R, E, Either.Either<A, A2>>): STM.STM<R, Either.Either<A, E>, A2> =>
  core.matchSTM(
    self,
    (e) => core.fail(Either.right(e)),
    Either.match({
      onLeft: (a) => core.fail(Either.left(a)),
      onRight: core.succeed
    })
  )

/** @internal */
export const partition = dual<
  <R, E, A, A2>(
    f: (a: A) => STM.STM<R, E, A2>
  ) => (
    elements: Iterable<A>
  ) => STM.STM<R, never, readonly [Array<E>, Array<A2>]>,
  <R, E, A, A2>(
    elements: Iterable<A>,
    f: (a: A) => STM.STM<R, E, A2>
  ) => STM.STM<R, never, readonly [Array<E>, Array<A2>]>
>(2, (elements, f) =>
  pipe(
    forEach(elements, (a) => either(f(a))),
    core.map((as) => effectCore.partitionMap(as, identity))
  ))

/** @internal */
export const some = <R, E, A>(self: STM.STM<R, E, Option.Option<A>>): STM.STM<R, Option.Option<E>, A> =>
  core.matchSTM(
    self,
    (e) => core.fail(Option.some(e)),
    Option.match({
      onNone: () => core.fail(Option.none()),
      onSome: core.succeed
    })
  )

/** @internal */
export const someOrElse = dual<
  <A2>(orElse: LazyArg<A2>) => <R, E, A>(self: STM.STM<R, E, Option.Option<A>>) => STM.STM<R, E, A2 | A>,
  <R, E, A, A2>(self: STM.STM<R, E, Option.Option<A>>, orElse: LazyArg<A2>) => STM.STM<R, E, A2 | A>
>(2, (self, orElse) => pipe(self, core.map(Option.getOrElse(orElse))))

/** @internal */
export const someOrElseSTM = dual<
  <R2, E2, A2>(
    orElse: LazyArg<STM.STM<R2, E2, A2>>
  ) => <R, E, A>(
    self: STM.STM<R, E, Option.Option<A>>
  ) => STM.STM<R2 | R, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, Option.Option<A>>,
    orElse: LazyArg<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2 | E, A2 | A>
>(2, <R, E, A, R2, E2, A2>(
  self: STM.STM<R, E, Option.Option<A>>,
  orElse: LazyArg<STM.STM<R2, E2, A2>>
): STM.STM<R2 | R, E2 | E, A2 | A> =>
  core.flatMap(
    self,
    Option.match({
      onNone: (): STM.STM<R | R2, E | E2, A | A2> => orElse(),
      onSome: core.succeed
    })
  ))

/** @internal */
export const someOrFail = dual<
  <E2>(error: LazyArg<E2>) => <R, E, A>(self: STM.STM<R, E, Option.Option<A>>) => STM.STM<R, E2 | E, A>,
  <R, E, A, E2>(self: STM.STM<R, E, Option.Option<A>>, error: LazyArg<E2>) => STM.STM<R, E2 | E, A>
>(2, (self, error) =>
  core.flatMap(
    self,
    Option.match({
      onNone: () => core.failSync(error),
      onSome: core.succeed
    })
  ))

/** @internal */
export const someOrFailException = <R, E, A>(
  self: STM.STM<R, E, Option.Option<A>>
): STM.STM<R, E | Cause.NoSuchElementException, A> =>
  pipe(
    core.matchSTM(
      self,
      core.fail,
      Option.match({
        onNone: () => core.fail(Cause.NoSuchElementException()),
        onSome: core.succeed
      })
    )
  )

/* @internal */
export const all: {
  <R, E, A, T extends ReadonlyArray<STM.STM<any, any, any>>>(
    self: STM.STM<R, E, A>,
    ...args: T
  ): STM.STM<
    R | T["length"] extends 0 ? never
      : [T[number]] extends [{ [STM.STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never,
    E | T["length"] extends 0 ? never
      : [T[number]] extends [{ [STM.STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    readonly [
      A,
      ...(T["length"] extends 0 ? []
        : Readonly<{ [K in keyof T]: [T[K]] extends [STM.STM<any, any, infer A>] ? A : never }>)
    ]
  >
  <T extends ReadonlyArray<STM.STM<any, any, any>>>(
    args: [...T]
  ): STM.STM<
    T[number] extends never ? never
      : [T[number]] extends [{ [STM.STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never,
    T[number] extends never ? never
      : [T[number]] extends [{ [STM.STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    T[number] extends never ? []
      : Readonly<{ [K in keyof T]: [T[K]] extends [STM.STM<any, any, infer A>] ? A : never }>
  >
  <T extends Readonly<{ [K: string]: STM.STM<any, any, any> }>>(
    args: T
  ): STM.STM<
    keyof T extends never ? never
      : [T[keyof T]] extends [{ [STM.STMTypeId]: { _R: (_: never) => infer R } }] ? R
      : never,
    keyof T extends never ? never
      : [T[keyof T]] extends [{ [STM.STMTypeId]: { _E: (_: never) => infer E } }] ? E
      : never,
    Readonly<{ [K in keyof T]: [T[K]] extends [STM.STM<any, any, infer A>] ? A : never }>
  >
} = function() {
  if (arguments.length === 1) {
    if (core.isSTM(arguments[0])) {
      return core.map(arguments[0], (x) => [x])
    } else if (Symbol.iterator in arguments[0]) {
      return collectAll(arguments[0])
    } else {
      return pipe(
        forEach(
          Object.entries(arguments[0] as Readonly<{ [K: string]: STM.STM<any, any, any> }>),
          ([_, e]) => core.map(e, (a) => [_, a] as const)
        ),
        core.map((values) => {
          const res = {}
          for (const [k, v] of values) {
            ;(res as any)[k] = v
          }
          return res
        })
      ) as any
    }
  }
  return collectAll(arguments)
}

/** @internal */
export const succeedLeft = <A>(value: A): STM.STM<never, never, Either.Either<A, never>> =>
  core.succeed(Either.left(value))

/** @internal */
export const succeedNone = (): STM.STM<never, never, Option.Option<never>> => core.succeed(Option.none())

/** @internal */
export const succeedRight = <A>(value: A): STM.STM<never, never, Either.Either<never, A>> =>
  core.succeed(Either.right(value))

/** @internal */
export const succeedSome = <A>(value: A): STM.STM<never, never, Option.Option<A>> => core.succeed(Option.some(value))

/** @internal */
export const summarized = dual<
  <R2, E2, A2, A3>(
    summary: STM.STM<R2, E2, A2>,
    f: (before: A2, after: A2) => A3
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, readonly [A3, A]>,
  <R, E, A, R2, E2, A2, A3>(
    self: STM.STM<R, E, A>,
    summary: STM.STM<R2, E2, A2>,
    f: (before: A2, after: A2) => A3
  ) => STM.STM<R2 | R, E2 | E, readonly [A3, A]>
>(3, (self, summary, f) =>
  core.flatMap(summary, (start) =>
    core.flatMap(self, (value) =>
      core.map(
        summary,
        (end) => [f(start, end), value] as const
      ))))

/** @internal */
export const suspend = <R, E, A>(evaluate: LazyArg<STM.STM<R, E, A>>): STM.STM<R, E, A> => flatten(core.sync(evaluate))

/** @internal */
export const tap = dual<
  <A, R2, E2, _>(f: (a: A) => STM.STM<R2, E2, _>) => <R, E>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, _>(self: STM.STM<R, E, A>, f: (a: A) => STM.STM<R2, E2, _>) => STM.STM<R2 | R, E2 | E, A>
>(2, (self, f) => core.flatMap(self, (a) => as(f(a), a)))

/** @internal */
export const tapBoth = dual<
  <E, R2, E2, A2, A, R3, E3, A3>(
    f: (error: E) => STM.STM<R2, E2, A2>,
    g: (value: A) => STM.STM<R3, E3, A3>
  ) => <R>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R3 | R, E | E2 | E3, A>,
  <R, E, R2, E2, A2, A, R3, E3, A3>(
    self: STM.STM<R, E, A>,
    f: (error: E) => STM.STM<R2, E2, A2>,
    g: (value: A) => STM.STM<R3, E3, A3>
  ) => STM.STM<R2 | R3 | R, E | E2 | E3, A>
>(3, (self, f, g) =>
  core.matchSTM(
    self,
    (e) => pipe(f(e), core.zipRight(core.fail(e))),
    (a) => pipe(g(a), as(a))
  ))

/** @internal */
export const tapError = dual<
  <E, R2, E2, _>(f: (error: E) => STM.STM<R2, E2, _>) => <R, A>(self: STM.STM<R, E, A>) => STM.STM<R2 | R, E | E2, A>,
  <R, A, E, R2, E2, _>(self: STM.STM<R, E, A>, f: (error: E) => STM.STM<R2, E2, _>) => STM.STM<R2 | R, E | E2, A>
>(2, (self, f) =>
  core.matchSTM(
    self,
    (e) => core.zipRight(f(e), core.fail(e)),
    core.succeed
  ))

/** @internal */
export const tryCatch = <E, A>(
  attempt: () => A,
  onThrow: (u: unknown) => E
): Effect.Effect<never, E, A> =>
  suspend(() => {
    try {
      return core.succeed(attempt())
    } catch (error) {
      return core.fail(onThrow(error))
    }
  })

/** @internal */
export const unit = (): STM.STM<never, never, void> => core.succeed(void 0)

/** @internal */
export const unleft = <R, E, A, A2>(self: STM.STM<R, Either.Either<E, A>, A2>): STM.STM<R, E, Either.Either<A2, A>> =>
  core.matchSTM(
    self,
    Either.match({
      onLeft: core.fail,
      onRight: (a) => core.succeed(Either.right(a))
    }),
    (a) => core.succeed(Either.left(a))
  )

/** @internal */
export const unless = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, Option.Option<A>>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: LazyArg<boolean>) => STM.STM<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  suspend(
    () => predicate() ? succeedNone() : asSome(self)
  ))

/** @internal */
export const unlessSTM = dual<
  <R2, E2>(
    predicate: STM.STM<R2, E2, boolean>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: STM.STM<R, E, A>,
    predicate: STM.STM<R2, E2, boolean>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>
>(2, (self, predicate) =>
  core.flatMap(
    predicate,
    (bool) => bool ? succeedNone() : asSome(self)
  ))

/** @internal */
export const unright = <R, E, A, A2>(
  self: STM.STM<R, Either.Either<A, E>, A2>
): STM.STM<R, E, Either.Either<A, A2>> =>
  core.matchSTM(
    self,
    Either.match({
      onLeft: (a) => core.succeed(Either.left(a)),
      onRight: core.fail
    }),
    (a) => core.succeed(Either.right(a))
  )

/** @internal */
export const unsome = <R, E, A>(self: STM.STM<R, Option.Option<E>, A>): STM.STM<R, E, Option.Option<A>> =>
  core.matchSTM(
    self,
    Option.match({
      onNone: () => core.succeed(Option.none()),
      onSome: core.fail
    }),
    (a) => core.succeed(Option.some(a))
  )

/** @internal */
export const validateAll = dual<
  <R, E, A, B>(
    f: (a: A) => STM.STM<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => STM.STM<R, RA.NonEmptyArray<E>, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => STM.STM<R, E, B>
  ) => STM.STM<R, RA.NonEmptyArray<E>, Array<B>>
>(
  2,
  (elements, f) =>
    core.flatMap(partition(elements, f), ([errors, values]) =>
      RA.isNonEmptyArray(errors) ?
        core.fail(errors) :
        core.succeed(values))
)

/** @internal */
export const validateFirst = dual<
  <R, E, A, B>(f: (a: A) => STM.STM<R, E, B>) => (elements: Iterable<A>) => STM.STM<R, Array<E>, B>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => STM.STM<R, E, B>) => STM.STM<R, Array<E>, B>
>(2, (elements, f) => flip(forEach(elements, (a) => flip(f(a)))))

/** @internal */
export const when = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: STM.STM<R, E, A>) => STM.STM<R, E, Option.Option<A>>,
  <R, E, A>(self: STM.STM<R, E, A>, predicate: LazyArg<boolean>) => STM.STM<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  suspend(
    () => predicate() ? asSome(self) : succeedNone()
  ))

/** @internal */
export const whenCase = <R, E, A, B>(
  evaluate: LazyArg<A>,
  pf: (a: A) => Option.Option<STM.STM<R, E, B>>
): STM.STM<R, E, Option.Option<B>> =>
  suspend(() =>
    pipe(
      Option.map(pf(evaluate()), asSome),
      Option.getOrElse(succeedNone)
    )
  )

/** @internal */
export const whenCaseSTM = dual<
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<STM.STM<R2, E2, A2>>
  ) => <R, E>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A2>>,
  <R, E, A, R2, E2, A2>(
    self: STM.STM<R, E, A>,
    pf: (a: A) => Option.Option<STM.STM<R2, E2, A2>>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A2>>
>(2, (self, pf) => core.flatMap(self, (a) => whenCase(() => a, pf)))

/** @internal */
export const whenSTM = dual<
  <R2, E2>(
    predicate: STM.STM<R2, E2, boolean>
  ) => <R, E, A>(
    self: STM.STM<R, E, A>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: STM.STM<R, E, A>,
    predicate: STM.STM<R2, E2, boolean>
  ) => STM.STM<R2 | R, E2 | E, Option.Option<A>>
>(2, (self, predicate) =>
  core.flatMap(
    predicate,
    (bool) => bool ? asSome(self) : succeedNone()
  ))
