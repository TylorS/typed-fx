import type * as fx from "@typed/fx/Fx"

export function isFx(value: unknown): value is fx.Fx<unknown, unknown, unknown> {
  return isObject(value) && isTagged(value) && hasRunFunction(value)
}

const isObject = (value: unknown): value is object => value !== null && typeof value === "object"

const isTagged = (value: object): value is Tagged => "_tag" in value && typeof value["_tag"] === "string"

type Tagged = { readonly _tag: string }

const hasRunFunction = (value: Tagged): value is fx.Fx<unknown, unknown, unknown> =>
  "run" in value && typeof value["run"] === "function"
