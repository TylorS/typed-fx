// import { deepStrictEqual } from 'assert'

// import * as TestClock from '@effect/io/internal/testing/testClock.js'
// import { TestEnvironment } from '@effect/io/internal/testing/testEnvironment.js'
// import { Duration, Effect, Fiber, pipe } from 'effect'

// import * as Fx from './index.js'

// describe(import.meta.url, () => {
//   describe(Fx.exhaustMapList.name, () => {
//     it('memoizes the input value its first stream', async () => {
//       let started = 0
//       const fx = pipe(
//         Fx.succeed([1, 2, 3]),
//         Fx.merge(pipe(Fx.succeed([3, 2, 1]), Fx.delay(Duration.millis(30)))),
//         Fx.exhaustMapList((a) => {
//           started++

//           return pipe(
//             Fx.periodic(Duration.millis(10)),
//             Fx.scan(a, (x) => x + a),
//             Fx.take(a * a),
//           )
//         }),
//       )

//       const test = pipe(
//         Effect.gen(function* ($) {
//           const fiber = yield* $(pipe(fx, Fx.runCollect, Effect.fork))

//           for (let i = 0; i < 20; i++) {
//             yield* $(TestClock.adjust(Duration.millis(10)))
//           }

//           return yield* $(Fiber.join(fiber))
//         }),
//         Effect.provideLayer(TestEnvironment),
//       )

//       const events = await Effect.unsafeRunPromise(test)

//       deepStrictEqual(events, [
//         [1, 2, 3],
//         [1, 2, 6],
//         [1, 4, 6],
//         [1, 6, 6],
//         [1, 6, 9],
//         [1, 6, 12],
//         [1, 8, 12],
//         [12, 8, 1],
//         [15, 8, 1],
//         [18, 8, 1],
//         [21, 8, 1],
//         [24, 8, 1],
//         [27, 8, 1],
//       ])

//       deepStrictEqual(started, 3)
//     })
//   })
// })
