import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Option } from "@typed/fx/internal/_externals"
import { fail } from "@typed/fx/internal/constructor/fail"
import { flatMap } from "@typed/fx/internal/operator/flatMap"
import { unit } from "@typed/fx/internal/typeclass/Of"

export const none = bodyWithTrace((trace) =>
  <R, E, A>(fx: Fx<R, E, Option.Option<A>>) =>
    flatMap(
      fx,
      Option.match(
        () => unit,
        fail
      )
    ).traced(trace)
)
