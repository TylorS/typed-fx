import { methodWithTrace } from "@effect/io/Debug"
import { Option } from "@typed/fx/internal/_externals"
import { fail } from "@typed/fx/internal/constructor/fail"
import type { Fx } from "@typed/fx/internal/Fx"
import { flatMap } from "@typed/fx/internal/operator/flatMap"
import { unit } from "@typed/fx/internal/typeclass/Of"

export const none = methodWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, Option.Option<A>>) =>
    flatMap(
      fx,
      Option.match(
        () => unit,
        fail
      )
    ).traced(trace)
)
