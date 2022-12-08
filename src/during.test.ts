// import { deepStrictEqual } from 'assert'

// import { Duration, Effect, Fiber, pipe } from 'effect'

// import * as Fx from './index.js'

// describe(import.meta.url, () => {
//   describe(Fx.during.name, () => {
//     it('runs a stream during a signal is emitted to stop', async () => {
//       const sut = Effect.gen(function* ($) {
//         const fiber = yield* $(
//           pipe(
//             Fx.periodic(Duration.millis(10)),
//             Fx.scan(0, (x) => x + 1),
//             Fx.during(Fx.at(Duration.millis(50))(Fx.at(Duration.millis(50))(null))),
//             Fx.runCollect,
//             Effect.fork,
//           ),
//         )

//         for (let i = 0; i < 10; i++) {
//           yield* $(TestClock.adjust(Duration.millis(10)))
//         }

//         return yield* $(Fiber.join(fiber))
//       })

//       const test = pipe(sut, Effect.provideLayer(TestEnvironment))
//       const events = await Effect.unsafeRunPromise(test)

//       deepStrictEqual(events, [6, 7, 8, 9, 10])
//     })
//   })
// })
