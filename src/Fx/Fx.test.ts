import { deepEqual, deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { Fx, access, fromLazy, provideLayers, success } from './Fx.js'
import { runMain } from './run.js'

import { tagged } from '@/Service/index.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(Fx.name, () => {
    describe('Sync', () => {
      it('allows running sync effects', async () => {
        const value = Math.random()
        const test = success(value)

        deepStrictEqual(await runMain(test), value)
      })

      it('allows using try/catch locally', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = access(() =>
          // eslint-disable-next-line require-yield
          Fx(function* () {
            try {
              throw new Error('foo')
            } catch (e) {
              deepStrictEqual(e, error)

              return value
            }
          }),
        )

        deepStrictEqual(await runMain(test), value)
      })

      it('allows using try/catch within nested Fx', async () => {
        const error = new Error('foo')
        const value = Math.random()
        const test = Fx(function* () {
          try {
            yield* access(() =>
              // eslint-disable-next-line require-yield
              Fx(function* () {
                throw new Error('foo')
              }),
            )
          } catch (e) {
            deepStrictEqual(e, error)

            return value
          }
        })

        deepStrictEqual(await runMain(test), value)
      })
    })

    describe('Env', () => {
      class Foo extends tagged('Foo') {}
      class Bar extends tagged('Bar') {}

      it('allows retrieving services', async () => {
        const test = Fx(function* () {
          const foo: Foo = yield* Foo.ask()

          deepEqual(foo.tag, 'Foo')
          deepStrictEqual(foo.id, Foo.id())

          const bar: Bar = yield* Bar.ask()

          deepEqual(bar.tag, 'Bar')
          deepStrictEqual(bar.id, Bar.id())
        })

        await pipe(test, new Foo().add(new Bar()).provide, runMain)
      })

      it('allows retrieving services from layers', async () => {
        const test = Fx(function* () {
          const foo: Foo = yield* Foo.ask()

          deepEqual(foo.tag, 'Foo')
          deepStrictEqual(foo.id, Foo.id())

          const bar: Bar = yield* Bar.ask()

          deepEqual(bar.tag, 'Bar')
          deepStrictEqual(bar.id, Bar.id())
        })

        await pipe(
          test,
          provideLayers([
            Foo.layer(fromLazy(() => new Foo())),
            Bar.layer(fromLazy(() => new Bar())),
          ]),
          runMain,
        )
      })
    })
  })
})
