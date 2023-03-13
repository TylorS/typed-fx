import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export class NeverFx extends BaseFx<never, never, never> {
  readonly _tag = "Never" as const

  constructor() {
    super()
  }

  run() {
    return Effect.never()
  }
}

export const never = new NeverFx()
