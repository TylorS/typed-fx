import { Just, Maybe } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Associative'

import type { IO } from './IO.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Stack } from '@/Stack/index.js'

export class IORefs {
  constructor(
    readonly locals: Atomic<ImmutableMap<IORef<any, any>, Stack<any>>> = Atomic<
      ImmutableMap<IORef<any, any>, Stack<any>>
    >(ImmutableMap()),
  ) {}
}

export class IORef<E, A> {
  constructor(
    readonly initial: IO<E, A>,
    readonly fork: (a: A) => Maybe<A> = Just,
    readonly join: (first: A, second: A) => A = Second.concat,
  ) {}
}
