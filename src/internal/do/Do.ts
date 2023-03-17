import type { Fx } from "@typed/fx/Fx"
import { succeed } from "@typed/fx/internal/constructor/succeed"

export const Do: Fx.Succeed<Readonly<Record<never, never>>> = succeed({})
