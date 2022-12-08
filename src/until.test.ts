// import { deepStrictEqual } from 'assert'

// import { Duration, Effect, Fiber, pipe } from 'effect'

// import * as Fx from './index.js'

// describe(import.meta.url, () => {
//   describe(Fx.until.name, () => {
//     it('runs a stream until a signal is emitted to stop', async () => {
//       const fx = pipe(Fx.periodic(Duration.millis(20)), Fx.until(Fx.at(Duration.millis(200))(null)))

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

//       deepStrictEqual(events.length, 10)
//     })
//   })
// })
