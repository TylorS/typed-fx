import { succeed } from "@typed/fx/internal/constructor/succeed"
import type { Fx } from "@typed/fx/internal/Fx"

export const Do: Fx.Succeed<Readonly<Record<never, never>>> = succeed({})
