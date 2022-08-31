import { pipe } from 'hkt-ts'
import { Just, Maybe, Nothing, isNothing, match } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Associative'

import type { IO } from './IO.js'

import { Atomic, update } from '@/Atomic/Atomic.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Stack } from '@/Stack/index.js'

export class IORefs {
  constructor(
    readonly locals: Atomic<ImmutableMap<IORef<any, any>, Stack<any>>> = Atomic<
      ImmutableMap<IORef<any, any>, Stack<any>>
    >(ImmutableMap()),
  ) {}

  static set<E, A>(ioRefs: IORefs, ioRef: IORef<E, A>, value: A) {
    pipe(
      ioRefs.locals,
      update((refs) =>
        refs.set(
          ioRef,
          pipe(
            ioRef,
            refs.get,
            match(
              () => new Stack(value),
              (c) => c.replace(() => value),
            ),
          ),
        ),
      ),
    )
  }

  static pushLocal<E, A>(ioRefs: IORefs, ioRef: IORef<E, A>, value: A) {
    const refs = ioRefs.locals.get()
    const current = refs.get(ioRef)

    if (isNothing(current)) {
      const stack = new Stack(value)

      ioRefs.locals.set(refs.set(ioRef, stack))

      return stack
    }

    const stack = current.value.push(value)

    ioRefs.locals.set(refs.set(ioRef, stack))

    return stack as Stack<A>
  }

  static popLocal<E, A>(ioRefs: IORefs, ioRef: IORef<E, A>) {
    const refs = ioRefs.locals.get()
    const current = refs.get(ioRef)

    if (isNothing(current)) {
      return Nothing
    }

    const currentStack = current.value
    const poppedStack = currentStack.pop()

    ioRefs.locals.set(poppedStack ? refs.set(ioRef, poppedStack) : refs.remove(ioRef))

    return poppedStack ? Just(poppedStack) : Nothing
  }
}

export class IORef<E, A> {
  constructor(
    readonly initial: IO<E, A>,
    readonly fork: (a: A) => Maybe<A> = Just,
    readonly join: (first: A, second: A) => A = Second.concat,
  ) {}
}
