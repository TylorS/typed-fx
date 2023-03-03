import { die } from "@effect/io/Cause"
import type { Fx } from "@typed/fx/Fx"

export function suspend<R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> {
  return {
    _tag: "Suspend",
    run: (sink) => {
      try {
        return f().run(sink)
      } catch (e) {
        return sink.error(die(e))
      }
    }
  }
}
