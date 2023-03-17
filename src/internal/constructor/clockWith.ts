import * as Clock from "@effect/io/Clock"
import type { Fx } from "@typed/fx/Fx"
import type { Effect } from "@typed/fx/internal/_externals"
import { serviceWith } from "@typed/fx/internal/context/serviceWith"
import { serviceWithEffect } from "@typed/fx/internal/context/serviceWithEffect"
import { serviceWithFx } from "@typed/fx/internal/context/serviceWithFx"

export const clockWith = <A>(f: (a: Clock.Clock) => A) => serviceWith(Clock.Tag, f)

export const clockWithEffect = <R, E, A>(f: (a: Clock.Clock) => Effect.Effect<R, E, A>) =>
  serviceWithEffect(Clock.Tag, f)

export const clockWithFx = <R, E, A>(f: (a: Clock.Clock) => Fx<R, E, A>) => serviceWithFx(Clock.Tag, f)
