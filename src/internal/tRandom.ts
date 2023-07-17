import * as Context from "@effect/data/Context"
import * as Random from "@effect/data/DeterministicRandom"
import { pipe } from "@effect/data/Function"
import * as Layer from "@effect/io/Layer"
import * as core from "@effect/stm/internal/core"
import * as stm from "@effect/stm/internal/stm"
import * as tArray from "@effect/stm/internal/tArray"
import * as tRef from "@effect/stm/internal/tRef"
import type * as STM from "@effect/stm/STM"
import type * as TArray from "@effect/stm/TArray"
import type * as TRandom from "@effect/stm/TRandom"
import type * as TRef from "@effect/stm/TRef"

const TRandomSymbolKey = "@effect/stm/TRandom"

/** @internal */
export const TRandomTypeId: TRandom.TRandomTypeId = Symbol.for(
  TRandomSymbolKey
) as TRandom.TRandomTypeId

const randomInteger = (state: Random.PCGRandomState): readonly [number, Random.PCGRandomState] => {
  const prng = new Random.PCGRandom()
  prng.setState(state)
  return [prng.integer(0), prng.getState()]
}

const randomIntegerBetween = (low: number, high: number) => {
  return (state: Random.PCGRandomState): readonly [number, Random.PCGRandomState] => {
    const prng = new Random.PCGRandom()
    prng.setState(state)
    return [prng.integer(high - low) + low, prng.getState()]
  }
}

const randomNumber = (state: Random.PCGRandomState): readonly [number, Random.PCGRandomState] => {
  const prng = new Random.PCGRandom()
  prng.setState(state)
  return [prng.number(), prng.getState()]
}

const withState = <A>(
  state: TRef.TRef<Random.PCGRandomState>,
  f: (state: Random.PCGRandomState) => readonly [A, Random.PCGRandomState]
): STM.STM<never, never, A> => {
  return pipe(state, tRef.modify(f))
}

const shuffleWith = <A>(
  iterable: Iterable<A>,
  nextIntBounded: (n: number) => STM.STM<never, never, number>
): STM.STM<never, never, Array<A>> => {
  const swap = (buffer: TArray.TArray<A>, index1: number, index2: number): STM.STM<never, never, void> =>
    pipe(
      buffer,
      tArray.get(index1),
      core.flatMap((tmp) =>
        pipe(
          buffer,
          tArray.updateSTM(index1, () => pipe(buffer, tArray.get(index2))),
          core.zipRight(
            pipe(
              buffer,
              tArray.update(index2, () => tmp)
            )
          )
        )
      )
    )
  return pipe(
    tArray.fromIterable(iterable),
    core.flatMap((buffer) => {
      const array: Array<number> = []
      for (let i = array.length; i >= 2; i = i - 1) {
        array.push(i)
      }
      return pipe(
        array,
        stm.forEach((n) => pipe(nextIntBounded(n), core.flatMap((k) => swap(buffer, n - 1, k))), { discard: true }),
        core.zipRight(tArray.toArray(buffer))
      )
    })
  )
}

/** @internal */
export const Tag = Context.Tag<TRandom.TRandom>()

class TRandomImpl implements TRandom.TRandom {
  readonly [TRandomTypeId]: TRandom.TRandomTypeId = TRandomTypeId
  constructor(readonly state: TRef.TRef<Random.PCGRandomState>) {}
  next = withState(this.state, randomNumber)
  nextBoolean = core.flatMap(this.next, (n) => core.succeed(n > 0.5))
  nextInt = withState(this.state, randomInteger)
  nextRange(min: number, max: number): STM.STM<never, never, number> {
    return core.flatMap(this.next, (n) => core.succeed((max - min) * n + min))
  }
  nextIntBetween(low: number, high: number): STM.STM<never, never, number> {
    return withState(this.state, randomIntegerBetween(low, high))
  }
  shuffle<A>(elements: Iterable<A>): STM.STM<never, never, Array<A>> {
    return shuffleWith(elements, (n) => this.nextIntBetween(0, n))
  }
}

/** @internal */
export const live: Layer.Layer<never, never, TRandom.TRandom> = Layer.effect(
  Tag,
  pipe(
    tRef.make(new Random.PCGRandom((Math.random() * 4294967296) >>> 0).getState()),
    core.map((seed) => new TRandomImpl(seed)),
    core.commit
  )
)

/** @internal */
export const next: STM.STM<TRandom.TRandom, never, number> = core.flatMap(Tag, (random) => random.next)

/** @internal */
export const nextBoolean: STM.STM<TRandom.TRandom, never, boolean> = core.flatMap(Tag, (random) => random.nextBoolean)

/** @internal */
export const nextInt: STM.STM<TRandom.TRandom, never, number> = core.flatMap(Tag, (random) => random.nextInt)

/** @internal */
export const nextIntBetween = (low: number, high: number): STM.STM<TRandom.TRandom, never, number> =>
  core.flatMap(Tag, (random) => random.nextIntBetween(low, high))

/** @internal */
export const nextRange = (min: number, max: number): STM.STM<TRandom.TRandom, never, number> =>
  core.flatMap(Tag, (random) => random.nextRange(min, max))

/** @internal */
export const shuffle = <A>(elements: Iterable<A>): STM.STM<TRandom.TRandom, never, Array<A>> =>
  core.flatMap(Tag, (random) => random.shuffle(elements))
