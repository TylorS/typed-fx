import type { Fx } from "@typed/fx/Fx"

export function suspendSucceed<R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> {
  return {
    run: (sink) => f().run(sink)
  }
}
