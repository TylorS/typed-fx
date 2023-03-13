import * as MutableRef from "@effect/data/MutableRef"
import type { Fx, Sink } from "@typed/fx/Fx"
import type { Scope } from "@typed/fx/internal/_externals"
import { Effect, Option } from "@typed/fx/internal/_externals"
import { never } from "@typed/fx/internal/constructor/never"
import { HoldFx } from "@typed/fx/internal/operator"

export interface HoldSubject<E, A> extends Fx<never, E, A>, Sink<never, E, A> {
  readonly current: MutableRef.MutableRef<Option.Option<A>>
}

export function makeHoldSubject<E, A>(): Effect.Effect<never, never, HoldSubject<E, A>> {
  return Effect.sync(() => HoldSubject.unsafeMake(MutableRef.make(Option.none<A>())))
}

export function makeScopedHoldSubject<E, A>(): Effect.Effect<Scope.Scope, never, HoldSubject<E, A>> {
  return Effect.gen(function*($) {
    const subject = yield* $(makeHoldSubject<E, A>())

    yield* $(Effect.addFinalizer(subject.end))

    return subject
  })
}

export namespace HoldSubject {
  export const unsafeMake = <E, A>(
    current: MutableRef.MutableRef<Option.Option<A>>
  ): HoldSubject<E, A> => new HoldSubjectImpl<E, A, "HoldSubject">(current, "HoldSubject")
}

/**
 * @internal
 */
export class HoldSubjectImpl<E, A, Tag extends string> extends HoldFx<never, E, A, Tag> implements HoldSubject<E, A> {
  constructor(current: MutableRef.MutableRef<Option.Option<A>>, tag: Tag) {
    super(never, current, tag, true)
  }
}
