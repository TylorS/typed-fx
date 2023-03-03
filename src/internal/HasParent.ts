import type { Fx } from "@typed/fx/Fx"

export const HAS_PARENTS = Symbol.for("@typed/fx/HAS_PARENTS")

export interface HasParents {
  readonly [HAS_PARENTS]: ReadonlyArray<Fx<any, any, any>>
}

export function hasParents(fx: unknown): fx is HasParents {
  return typeof fx === "object" && fx !== null && HAS_PARENTS in fx
}
