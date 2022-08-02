import { deepStrictEqual, ok } from 'assert'

import { constVoid, pipe } from 'hkt-ts'
import { Left, Right, isLeft } from 'hkt-ts/Either'
import { Nothing } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Eff } from '../Eff.js'
import { ensuring } from '../Instructions/Ensuring.js'
import { failure } from '../Instructions/Failure.js'
import { addTrace, async, fromLazy, getTrace, uninterruptable } from '../index.js'

import { Heap } from './Heap.js'
import { AnyInstruction } from './Instruction.js'
import { Process } from './Process.js'
import { ProcessorEff } from './ProcessorEff.js'

import { died } from '@/Cause/Cause.js'
import { Exit } from '@/Exit/Exit.js'
import { Platform } from '@/Platform/Platform.js'
import { Debug, Trace } from '@/Trace/Trace.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Process.name, () => {
    it('allows running an Eff with no instructions', (done) => {
      const value = 1
      const process = testProcess(Eff.of(value))

      process.addObserver((exit) => {
        try {
          deepStrictEqual(exit, Right(value))
          done()
        } catch (e) {
          done(e)
        }
      })

      ok(process.start())
    })

    describe('Runtime Instructions / Built-ins', () => {
      describe('Async', () => {
        it('allows running async operations', (done) => {
          const value = 42
          const test = async<never, typeof value, never>((cb) => {
            const id = setTimeout(() => cb(Eff.of(value)), 50)

            return Left(Eff.fromLazy(() => clearTimeout(id)))
          })

          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(value))
              done()
            } catch (e) {
              done(e)
            }
          })

          ok(process.start())
        })

        it('allows returning immediately', (done) => {
          const value = 42
          const test = async<never, number, never>(() => {
            return Right(Eff.of(value)) // Return immediately
          })

          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(value))
              done()
            } catch (e) {
              done(e)
            }
          })

          ok(process.start())
        })
      })

      describe('Failures', () => {
        it('handles capturing Failures', (done) => {
          const error = new Error('test')
          const cause = died(error)
          const test = Eff(function* () {
            return yield* failure(cause)
          })

          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              ok(isLeft(exit))
              ok(exit.left.tag === 'Traced')
              deepStrictEqual(exit.left.cause, cause)
              done()
            } catch (e) {
              done(e)
            }
          })

          ok(process.start())
        })

        it('allows try/catch to respond to all failures', (done) => {
          const value = 42
          const test = Eff(function* () {
            try {
              return yield* failure(died(new Error('test')))
            } catch {
              return value
            }
          })

          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(value))
              done()
            } catch (e) {
              done(e)
            }
          })

          ok(process.start())
        })
      })

      describe('Tracing', () => {
        describe.skip('adds traces to Failures', constVoid)

        it('allows adding custom Traces', (done) => {
          const message = `test ${Math.random()}`
          const test = pipe(failure(died(new Error('foo'))), addTrace(Trace.custom(message)))
          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              ok(isLeft(exit))
              ok(exit.left.tag === 'Traced')
              ok(Debug.debug(exit.left.trace).includes(message))

              done()
            } catch (e) {
              done(e)
            }
          })

          process.start()
        })

        it('allows getting the current Trace', (done) => {
          const message = `test ${Math.random()}`
          const test = pipe(
            Eff(function* () {
              const trace = yield* getTrace

              ok(Debug.debug(trace).includes(message))

              return message
            }),
            addTrace(Trace.custom(message)),
          )
          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(message))
              done()
            } catch (e) {
              done(e)
            }
          })

          process.start()
        })
      })

      describe('Finalization', () => {
        it('finalizes even when interrupted by an arbitary Eff', (done) => {
          const error = new Error('test')
          const cause = died(error)
          const value = 42
          let called = 0
          const test = async<never, typeof value, never>((cb) => {
            const id = setTimeout(() => cb(Eff.of(value)), 1000 * 60 * 60)

            return Left(
              Eff.fromLazy(() => {
                called += 1
                clearTimeout(id)
              }),
            )
          })

          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              deepStrictEqual(called, 1)
              ok(isLeft(exit))
              ok(exit.left.tag === 'Traced')
              deepStrictEqual(exit.left.cause, cause)
              done()
            } catch (e) {
              done(e)
            }
          })

          ok(process.start())

          testProcess(process.runEff(failure(cause))).start()
        })

        describe('Ensuring', () => {
          it('allows finalizing an Eff with success', (done) => {
            const value = Math.random()
            const test = pipe(
              Eff.of(value),
              ensuring((exit) =>
                Eff.fromLazy(() => {
                  try {
                    deepStrictEqual(exit, Right(value))
                    done()
                  } catch (e) {
                    done(e)
                  }
                }),
              ),
            )

            const process = testProcess(test)

            process.start()
          })

          it('allows finalizing an Eff with failures', (done) => {
            const cause = died(new Error('test'))
            const test = pipe(
              failure(cause),
              ensuring((exit) =>
                Eff.fromLazy(() => {
                  try {
                    ok(isLeft(exit))
                    ok(exit.left.tag === 'Traced')
                    deepStrictEqual(exit.left.cause, cause)
                    done()
                  } catch (e) {
                    done(e)
                  }
                }),
              ),
            )

            const process = testProcess(test)

            process.start()
          })
        })
      })

      describe('Arbitrary Eff', () => {
        it('allows running any arbitrary Eff', (done) => {
          const value = 42
          const test = async<never, typeof value, never>((cb) => {
            const id = setTimeout(() => cb(Eff.of(value)), 1000 * 60 * 60)

            return Left(
              Eff.fromLazy(() => {
                clearTimeout(id)
              }),
            )
          })

          const process = testProcess(test)

          ok(process.start())

          const arbitraryEff = process.runEff(Eff.of(value))
          const arbitaryProcess = testProcess(arbitraryEff)

          arbitaryProcess.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(Right(value)))
              done()
            } catch (e) {
              done(e)
            }
          })

          arbitaryProcess.start()
        })
      })

      describe('Interruption', () => {
        it('allows marking region as uninterruptable', (done) => {
          const value = 42

          let finished = false
          const test = uninterruptable(
            async<never, typeof value, never>((cb) => {
              const id = setTimeout(() => {
                finished = true
                cb(Eff.of(value))
              }, 20)

              return Left(Eff.fromLazy(() => clearTimeout(id)))
            }),
          )

          const process = testProcess(test)

          process.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(value))
            } catch (e) {
              done(e)
            }
          })

          ok(process.start())

          const arbitraryEff = process.runEff(
            Eff.fromLazy(() => {
              ok(finished)

              return value
            }),
          )
          const arbitaryProcess = testProcess(arbitraryEff)

          arbitaryProcess.addObserver((exit) => {
            try {
              deepStrictEqual(exit, Right(Right(value)))
              done()
            } catch (e) {
              done(e)
            }
          })

          arbitaryProcess.start()
        })
      })

      describe('Cooperative yielding', () => {
        it('uses the configured maxOpCount to determine when to yield', async () => {
          const test = Eff(function* () {
            const a = yield* fromLazy(() => 1)
            const b = yield* fromLazy(() => 2)
            const c = yield* fromLazy(() => 3)

            return a + b + c
          })

          const [noLimitTime, noLimitExit] = await timeProcess(test)
          const [limitTime, limitExit] = await timeProcess(test, NonNegativeInteger(1))

          deepStrictEqual(noLimitExit, limitExit)
          ok(limitTime > noLimitTime * 3)
        })
      })
    })
  })
})

function timeProcess<Y extends AnyInstruction, E = never, A = any>(
  eff: ProcessorEff<Y, E, A>,
  maxOpCount?: NonNegativeInteger,
) {
  return new Promise<[number, Exit<E, A>]>((resolve) => {
    const process = testProcess(eff, maxOpCount)
    const start = Date.now()

    process.addObserver((exit) => {
      resolve([Date.now() - start, exit])
    })

    process.start()
  })
}

function testProcess<Y extends AnyInstruction, E = never, A = any>(
  eff: ProcessorEff<Y, E, A>,
  maxOpCount: NonNegativeInteger = NonNegativeInteger(Number.MAX_SAFE_INTEGER),
) {
  return new Process(
    eff,
    {
      platform: Platform(undefined, maxOpCount, undefined),
      heap: new Heap(),
      trace: Nothing,
    },
    (i) =>
      ProcessorEff(function* () {
        return yield i
      }),
  )
}
