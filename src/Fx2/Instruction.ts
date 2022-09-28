import { flow, pipe } from 'hkt-ts'
import { Either } from 'hkt-ts/Either'
import { Just, Maybe, Nothing, match } from 'hkt-ts/Maybe'
import { NonEmptyArray } from 'hkt-ts/NonEmptyArray'

import type { Env } from './Env.js'
import type { Fiber } from './Fiber.js'
import type { FiberRefs } from './FiberRef.js'
import type { Future } from './Future.js'
import { Fx } from './Fx.js'
import type { Closeable } from './Scope.js'

import * as Cause from '@/Cause/Cause.js'
import * as Exit from '@/Exit/index.js'
import type { FiberId } from '@/FiberId/FiberId.js'
import type { Platform } from '@/Platform/Platform.js'

// TODO: Supervision
// TODO: Logger
// TODO: Parent
// TODO: Tracing

export type Instruction =
  | Now<any>
  | Fail<any>
  | FromLazy<any>
  | LazyFx<any, any, any>
  | GetFiberId
  | GetFiberRefs
  | GetPlatform
  | GetEnv<any>
  | ProvideEnv<any, any, any>
  | ControlFrame<any, any, any, any, any, any>
  | Wait<any, any, any>
  | Fork<any, any, any>
  | BothFx<any, any, any, any, any, any>
  | EitherFx<any, any, any, any, any, any>
  | SetInterruptStatus<any, any, any>

export class Now<A> extends Fx<never, never, A> {
  static tag = 'Now' as const
  readonly tag = Now.tag

  constructor(readonly value: A) {
    super()
  }
}

export class Fail<E> extends Fx<never, E, never> {
  static tag = 'Fail' as const
  readonly tag = Fail.tag

  constructor(readonly cause: Cause.Cause<E>) {
    super()
  }
}

export class FromLazy<A> extends Fx<never, never, A> {
  static tag = 'FromLazy' as const
  readonly tag = FromLazy.tag

  constructor(readonly f: () => A) {
    super()
  }
}

export class LazyFx<R, E, A> extends Fx<R, E, A> {
  static tag = 'LazyFx' as const
  readonly tag = LazyFx.tag

  constructor(readonly f: () => Fx<R, E, A>) {
    super()
  }
}

export class ControlFrame<R, E, A, R2, E2, B> extends Fx<R | R2, E2, B> {
  static tag = 'ControlFrame' as const
  readonly tag = ControlFrame.tag

  constructor(
    readonly fx: Fx<R, E, A>,
    // Allow multiple frames to be fused together into a single instruction
    readonly frames: NonEmptyArray<Frame<any, any, any, any, any>>,
  ) {
    super()
  }

  static make<R, E, A, R2, E2, B>(
    fx: Fx<R, E, A>,
    frame: Frame<E, A, R2, E2, B>,
  ): Fx<R | R2, E2, B> {
    if (fx instanceof ControlFrame) {
      const last = fx.frames[fx.frames.length - 1]
      const fused = pipe(
        fuseControlFrames(last, frame),
        match(
          (): NonEmptyArray<Frame<any, any, any, any, any>> => [...fx.frames, frame],
          (f): NonEmptyArray<Frame<any, any, any, any, any>> =>
            [...fx.frames.slice(0, -1), f] as any,
        ),
      )

      return new ControlFrame(fx.fx, fused)
    }

    return new ControlFrame(fx, [frame])
  }
}

export type Frame<E, A, R2, E2, B> =
  | MapFrame<A, B>
  | MapLeftFrame<E, E2>
  | BimapFrame<E, E2, A, B>
  | FlatMapFrame<A, R2, E2, B>
  | OrElseFrame<E, R2, E2, B>
  | AttemptFrame<E, A, R2, E2, B>
  | PopFrame

export class MapFrame<A, B> {
  static tag = 'MapFrame' as const
  readonly tag = MapFrame.tag

  constructor(readonly f: (a: A) => B) {}
}

export class MapLeftFrame<A, B> {
  static tag = 'MapLeftFrame' as const
  readonly tag = MapLeftFrame.tag

  constructor(readonly f: (a: A) => B) {}
}

export class BimapFrame<A, B, C, D> {
  static tag = 'BimapFrame' as const
  readonly tag = BimapFrame.tag

  constructor(readonly f: (a: A) => B, readonly g: (c: C) => D) {}
}

export class FlatMapFrame<A, R2, E2, B> {
  static tag = 'FlatMapFrame' as const
  readonly tag = FlatMapFrame.tag

  constructor(readonly f: (a: A) => Fx<R2, E2, B>) {}
}

export class OrElseFrame<E, R2, E2, B> {
  static tag = 'OrElseFrame' as const
  readonly tag = OrElseFrame.tag

  constructor(readonly f: (e: Cause.Cause<E>) => Fx<R2, E2, B>) {}
}

export class AttemptFrame<E, A, R2, E2, B> {
  static tag = 'AttemptFrame' as const
  readonly tag = AttemptFrame.tag

  constructor(readonly f: (e: Exit.Exit<E, A>) => Fx<R2, E2, B>) {}
}

export class PopFrame {
  static tag = 'PopFrame' as const
  readonly tag = PopFrame.tag

  constructor(readonly pop: () => void) {}
}

const fusionMap = {
  [MapFrame.tag]: (last: Frame<any, any, any, any, any>, incoming: MapFrame<any, any>) => {
    if (last.tag === MapFrame.tag) {
      return Just(new MapFrame(flow(last.f, incoming.f)))
    }

    if (last.tag === MapLeftFrame.tag) {
      return Just(new BimapFrame(last.f, incoming.f))
    }

    if (last.tag === BimapFrame.tag) {
      return Just(new BimapFrame(last.f, flow(last.g, incoming.f)))
    }

    return Nothing
  },
  [MapLeftFrame.tag]: (last: Frame<any, any, any, any, any>, incoming: MapLeftFrame<any, any>) => {
    if (last.tag === MapFrame.tag) {
      return Just(new BimapFrame(incoming.f, last.f))
    }

    if (last.tag === MapLeftFrame.tag) {
      return Just(new MapLeftFrame(flow(last.f, incoming.f)))
    }

    if (last.tag === BimapFrame.tag) {
      return Just(new BimapFrame(flow(last.f, incoming.f), last.g))
    }

    return Nothing
  },
  [BimapFrame.tag]: (
    last: Frame<any, any, any, any, any>,
    incoming: BimapFrame<any, any, any, any>,
  ) => {
    if (last.tag === MapFrame.tag) {
      return Just(new BimapFrame(incoming.f, flow(last.f, incoming.g)))
    }

    if (last.tag === MapLeftFrame.tag) {
      return Just(new BimapFrame(flow(last.f, incoming.f), incoming.g))
    }

    if (last.tag === BimapFrame.tag) {
      return Just(new BimapFrame(flow(last.f, incoming.f), flow(last.g, incoming.g)))
    }

    return Nothing
  },
  [FlatMapFrame.tag]: (
    last: Frame<any, any, any, any, any>,
    incoming: FlatMapFrame<any, any, any, any>,
  ) => {
    if (last.tag === MapFrame.tag) {
      return Just(new FlatMapFrame(flow(last.f, incoming.f)))
    }

    return Nothing
  },
  [OrElseFrame.tag]: (
    last: Frame<any, any, any, any, any>,
    incoming: OrElseFrame<any, any, any, any>,
  ) => {
    if (last.tag === MapLeftFrame.tag) {
      return Just(new OrElseFrame(flow(last.f, incoming.f)))
    }

    return Nothing
  },
  [AttemptFrame.tag]: (
    last: Frame<any, any, any, any, any>,
    incoming: AttemptFrame<any, any, any, any, any>,
  ) => {
    if (last.tag === MapFrame.tag) {
      return Just(new AttemptFrame(flow(Exit.map(last.f), incoming.f)))
    }

    if (last.tag === MapLeftFrame.tag) {
      return Just(new AttemptFrame(flow(Exit.mapLeft(last.f), incoming.f)))
    }

    if (last.tag === BimapFrame.tag) {
      return Just(new AttemptFrame(flow(Exit.bimap(last.f, last.g), incoming.f)))
    }

    return Nothing
  },
  [PopFrame.tag]: (last: Frame<any, any, any, any, any>, incoming: PopFrame) => {
    if (last.tag === PopFrame.tag) {
      return Just(
        new PopFrame(() => {
          last.pop()
          incoming.pop()
        }),
      )
    }

    return Nothing
  },
}

export function fuseControlFrames<E, A, R2, E2, B>(
  last: Frame<any, any, any, any, any>,
  frame: Frame<E, A, R2, E2, B>,
): Maybe<Frame<any, any, any, any, any>> {
  return fusionMap[frame.tag](last, frame as any)
}

export class GetFiberId extends Fx<never, never, FiberId.Live> {
  static tag = 'GetFiberId' as const
  readonly tag = GetFiberId.tag
}

export class GetFiberRefs extends Fx<never, never, FiberRefs> {
  static tag = 'GetFiberRefs' as const
  readonly tag = GetFiberRefs.tag
}

export class GetPlatform extends Fx<never, never, Platform> {
  static tag = 'GetPlatform' as const
  readonly tag = GetPlatform.tag
}

export class GetScope extends Fx<never, never, Closeable> {
  static tag = 'GetScope' as const
  readonly tag = GetScope.tag
}

export class GetEnv<R> extends Fx<R, never, Env<R>> {
  static tag = 'GetEnv' as const
  readonly tag = GetEnv.tag
}

export class ProvideEnv<R, E, A> extends Fx<never, E, A> {
  static tag = 'ProvideEnv' as const
  readonly tag = ProvideEnv.tag

  constructor(readonly fx: Fx<R, E, A>, readonly env: Env<R>) {
    super()
  }
}

export class Wait<R, E, A> extends Fx<R, E, A> {
  static tag = 'Wait' as const
  readonly tag = Wait.tag

  constructor(readonly future: Future<R, E, A>) {
    super()
  }
}

export class Fork<R, E, A> extends Fx<R, never, Fiber<E, A>> {
  static tag = 'Fork' as const
  readonly tag = Fork.tag

  constructor(readonly fx: Fx<R, E, A>) {
    super()
  }
}

export class BothFx<R, E, A, R2, E2, A2> extends Fx<R | R2, E | E2, readonly [A, A2]> {
  static tag = 'BothFx' as const
  readonly tag = BothFx.tag

  constructor(readonly left: Fx<R, E, A>, readonly right: Fx<R2, E2, A2>) {
    super()
  }
}

export class EitherFx<R, E, A, R2, E2, A2> extends Fx<R | R2, E | E2, Either<A, A2>> {
  static tag = 'EitherFx' as const
  readonly tag = EitherFx.tag

  constructor(readonly left: Fx<R, E, A>, readonly right: Fx<R2, E2, A2>) {
    super()
  }
}

export class SetInterruptStatus<R, E, A> extends Fx<R, E, A> {
  static tag = 'SetInterruptStatus' as const
  readonly tag = SetInterruptStatus.tag

  constructor(readonly fx: Fx<R, E, A>, readonly interruptStatus: boolean) {
    super()
  }
}
