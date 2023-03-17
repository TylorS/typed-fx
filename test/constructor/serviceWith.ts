import { Tag } from "@effect/data/Context"
import { runCollectAll } from "@typed/fx"
import { Chunk, Effect, pipe } from "@typed/fx/internal/_externals"
import { serviceWith } from "@typed/fx/internal/context/serviceWith"

describe(__filename, () => {
  describe(serviceWith.name, () => {
    interface Foo {
      readonly a: number
    }

    const Foo = Tag<Foo>()

    it("provides a service to the Fx", async () => {
      const value = 1
      const test = pipe(
        Effect.gen(function*(_) {
          const chunk = yield* _(runCollectAll(serviceWith(Foo, (f) => f.a)))

          expect(Chunk.toReadonlyArray(chunk)).toEqual([value])
        }),
        Effect.provideService(Foo, { a: value })
      )

      await Effect.runPromise(test)
    })
  })
})
