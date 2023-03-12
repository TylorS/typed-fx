import { identity } from "@typed/fx/internal/_externals"
import { noneOrFailWith } from "@typed/fx/internal/constructor/noneOrFailWith"

export const noneOrFail = noneOrFailWith(identity)
