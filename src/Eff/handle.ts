import { Eff } from './Eff.js'

export function handle<Y, R, Y2, R2>(
  f: (instr: Generator<Y, R>, result: IteratorResult<Y, R>) => Generator<Y2, R2>,
) {
  return (eff: Eff<Y, R>): Eff<Y2, R2> =>
    Eff(function* () {
      const gen = runGen(Eff.gen(eff))

      try {
        return yield* f(gen, gen.next())
      } catch (e) {
        return yield* f(gen, gen.throw(e))
      }
    })
}

function* runGen<Y, R>(gen: Generator<Y, R>) {
  let value!: R

  try {
    value = yield* runUntilComplete(gen, gen.next())
  } catch (e) {
    value = yield* runUntilComplete(gen, gen.throw(e))
  } finally {
    yield* runUntilComplete(gen, gen.return(value))
  }

  return value
}

function* runUntilComplete<Y, R>(gen: Generator<Y, R>, result: IteratorResult<Y, R>) {
  while (!result.done) {
    result = gen.next(yield result.value)
  }

  return result.value
}
