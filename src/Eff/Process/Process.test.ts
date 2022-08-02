import { deepStrictEqual, ok } from 'assert'

import { Left, Right, isLeft } from 'hkt-ts/Either'
import { Nothing } from 'hkt-ts/Maybe'

import { Eff } from '../Eff.js'
import { failure } from '../Instructions/Failure.js'

import { Heap } from './Heap.js'
import { Process } from './Process.js'
import { ProcessorEff } from './ProcessorEff.js'

import { died } from '@/Cause/Cause.js'
import { Platform } from '@/Platform/Platform.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Process.name, () => {
    it('allows running an Eff with no instructions', (done) => {
      const value = 1
      const process = new Process(
        Eff.of(value),
        {
          platform: Platform(),
          heap: new Heap(),
          trace: Nothing,
        },
        () =>
          ProcessorEff(function* () {
            // No Instructions to interpret
          }),
      )

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
        it('allows running async operations', () => {})

        it('allows returning immediately', () => {})

        it('allows registering a Finalizer', () => {})
      })

      describe('Failures', () => {
        it('handles capturing Failures', (done) => {
          const error = new Error('test')
          const cause = died(error)
          const test = Eff(function* () {
            return yield* failure(cause)
          })

          const process = new Process(
            test,
            {
              platform: Platform(),
              heap: new Heap(),
              trace: Nothing,
            },
            (i) =>
              ProcessorEff(function* () {
                return yield i
              }),
          )

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

          const process = new Process(
            test,
            {
              platform: Platform(),
              heap: new Heap(),
              trace: Nothing,
            },
            (i) =>
              ProcessorEff(function* () {
                return yield i
              }),
          )

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
        describe('adds traces to Failures', () => {})

        describe('adding a Trace', () => {})

        describe('getting the current Trace', () => {})
      })

      describe('Finalization', () => {})

      describe('Arbitrary Eff', () => {})

      describe('Interruption', () => {})

      describe('Cooperative yielding', () => {})
    })
  })
})
