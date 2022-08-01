import { ListOf } from 'ts-toolbelt/out/Union/ListOf.js'

/**
 * Redistribute every union and strictly exclude values.
 */
export type StrictExclude<T, U> = ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? Head extends U
    ? StrictExclude<Tail[number], U>
    : Head | StrictExclude<Tail[number], U>
  : never

/**
 * Redistribute every union and strictly extract values.
 */
export type StrictExtract<T, U> = ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? Head extends U
    ? Head | StrictExtract<Tail[number], U>
    : StrictExtract<Tail[number], U>
  : never

export type StrictExcludeAll<T, U extends readonly any[]> = U extends readonly [
  infer Head,
  ...infer Tail,
]
  ? StrictExcludeAll<StrictExclude<T, Head>, Tail>
  : T

export type StrictExtractAll<T, U extends readonly any[]> = U extends readonly [
  infer Head,
  ...infer Tail,
]
  ? StrictExtractAll<StrictExtract<T, Head>, Tail>
  : T
