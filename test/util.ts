import { unannotate } from "@effect/io/Cause"
import { isFailure } from "@effect/io/Exit"
import type { Cause } from "@typed/fx/internal/_externals"
import { Chunk, Effect } from "@typed/fx/internal/_externals"
import type { Fx } from "@typed/fx/internal/Fx"
import { toChunk } from "@typed/fx/internal/run"

export function testCollectAll<E, A>(
  name: string,
  fx: Fx<never, E, A>,
  expected: ReadonlyArray<A>
) {
  it(name, async () => {
    expect(Chunk.toReadonlyArray(await Effect.runPromise(toChunk(fx)))).toEqual(expected)
  })
}

export function testCause<E, A>(
  name: string,
  fx: Fx<never, E, A>,
  expected: Cause.Cause<E>
) {
  it(name, async () => {
    const test = toChunk(fx)
    const exit = await Effect.runPromiseExit(test)

    assert(isFailure(exit))
    expect(unannotate(exit.cause)).toEqual(expected)
  })
}
