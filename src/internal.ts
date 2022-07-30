import { Equals } from 'ts-toolbelt/out/Any/Equals.js'
import { ListOf } from 'ts-toolbelt/out/Union/ListOf.js'

/**
 * Redistribute every union and strictly exclude values.
 */
export type StrictExclude<T, U> = ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? Equals<Head, U> extends 1
    ? StrictExclude<Tail[number], U>
    : Head | StrictExclude<Tail[number], U>
  : never

/**
 * Redistribute every union and strictly extract values.
 */
export type StrictExtract<T, U> = ListOf<T> extends readonly [infer Head, ...infer Tail]
  ? Equals<Head, U> extends 1
    ? Head | StrictExtract<Tail[number], U>
    : StrictExtract<Tail[number], U>
  : never
