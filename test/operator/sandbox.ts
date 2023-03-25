import { isLeft } from "@effect/data/Either"
import * as Cause from "@effect/io/Cause"
import { Chunk, Effect } from "@typed/fx/internal/_externals"
import { fail, succeed } from "@typed/fx/internal/constructor"
import { sandbox } from "@typed/fx/internal/operator"
import { toChunk } from "@typed/fx/internal/run"

describe(__filename, () => {
  describe(sandbox.name, () => {
    it("creates a sandboxed Fx", async () => {
      const success = toChunk(sandbox(succeed(1)))
      const failure = toChunk(sandbox(fail("Expected")))

      expect(Chunk.toReadonlyArray(await Effect.runPromise(success))).toEqual([1])

      const either = await Effect.runPromiseEither(failure)

      assert(isLeft(either))

      expect(Cause.unannotate(either.left)).toEqual(Cause.fail("Expected"))
    })
  })
})
