import type { Option } from "@typed/fx/internal/_externals"
import { identity } from "@typed/fx/internal/_externals"
import { noneOrFailWith } from "@typed/fx/internal/constructor/noneOrFailWith"
import type { Fx } from "@typed/fx/internal/Fx"

export const noneOrFail: <A>(option: Option.Option<A>) => Fx<never, A, void> = noneOrFailWith(identity)
