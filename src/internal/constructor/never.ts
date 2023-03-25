import { Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"

export class NeverFx extends BaseFx<never, never, never> {
  readonly name = "Never" as const

  constructor() {
    super()
  }

  run() {
    return Effect.never()
  }
}

export const never = new NeverFx()
