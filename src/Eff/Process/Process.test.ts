import { deepStrictEqual, ok } from 'assert'

import { Right } from 'hkt-ts/Either'
import { Nothing } from 'hkt-ts/Maybe'

import { Eff } from '../Eff.js'

import { Heap } from './Heap.js'
import { Process } from './Process.js'
import { ProcessorEff } from './ProcessorEff.js'

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

      describe('Failures', () => {})

      describe('Tracing', () => {
        describe('adds')

        describe('adding a custom Trace', () => {})

        describe('')
      })

      describe('Finalization', () => {})

      describe('Arbitrary Eff', () => {})

      describe('Interruption', () => {})

      describe('Cooperative yielding', () => {})
    })
  })
})
