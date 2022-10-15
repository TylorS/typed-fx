import { flow } from 'hkt-ts'
import type { Either } from 'hkt-ts/Either'

import { Effect } from './Effect.js'

import type { Cause } from '@/Cause/Cause.js'
import type { Disposable } from '@/Disposable/Disposable.js'
import type { Env } from '@/Env/Env.js'
import type { AnyExit } from '@/Exit/Exit.js'

export type Op = AskEnv | Provide | Fail | Now | FromLazy | Lazy | Async | ControlFrame

abstract class BaseOp extends Effect<any, any, any> {
  readonly op = this as any as Op;

  readonly [Symbol.iterator] = yieldThis
}

function* yieldThis<T extends Effect<any, any, any>>(
  this: T,
): Generator<T, Effect.OutputOf<T>, any> {
  return yield this
}

export class AskEnv extends BaseOp {
  readonly tag = 'AskEnv'
}

export class Provide extends BaseOp {
  readonly tag = 'Provide'
  constructor(readonly effect: Effect<any, any, any>, readonly env: Env<any>) {
    super()
  }
}

export class Fail extends BaseOp {
  readonly tag = 'Fail'
  constructor(readonly cause: Cause<any>) {
    super()
  }
}

export class Now extends BaseOp {
  readonly tag = 'Now'
  constructor(readonly value: any) {
    super()
  }
}

export class FromLazy extends BaseOp {
  readonly tag = 'FromLazy'
  constructor(readonly f: () => any) {
    super()
  }
}

export class Lazy extends BaseOp {
  readonly tag = 'Lazy'
  constructor(readonly f: () => Effect<any, any, any>) {
    super()
  }
}

export class Async extends BaseOp {
  readonly tag = 'Async'
  constructor(
    readonly f: (
      cb: (effect: Effect<any, any, any>) => void,
    ) => Either<Disposable, Effect<any, any, any>>,
  ) {
    super()
  }
}

export type ControlFrame =
  | BimapFrame
  | MapFrame
  | MapLeftFrame
  | ExitFrame
  | FlatMapFrame
  | OrElseFrame
  | InterruptFrame

export class BimapFrame extends BaseOp {
  readonly tag = 'Bimap'
  constructor(
    readonly effect: Effect<any, any, any>,
    readonly f: (cause: Cause<any>) => Cause<any>,
    readonly g: (a: any) => any,
  ) {
    super()
  }
}

export class MapFrame extends BaseOp {
  readonly tag = 'Map'

  constructor(readonly effect: Effect<any, any, any>, readonly f: (a: any) => any) {
    super()
  }

  static make(effect: Effect<any, any, any>, f: (a: any) => any): Op {
    const op = effect.op
    const tag = op.tag

    if (tag === 'Map') {
      return MapFrame.make(op.effect, flow(op.f, f))
    } else if (tag === 'Now') {
      return new Now(f(op.value))
    } else if (tag === 'Lazy') {
      return new Lazy(() => MapFrame.make(op.f(), f))
    }

    return new MapFrame(effect, f)
  }
}

export class MapLeftFrame extends BaseOp {
  readonly tag = 'MapLeft'
  constructor(readonly effect: Effect<any, any, any>, readonly f: (a: Cause<any>) => Cause<any>) {
    super()
  }
}

export class ExitFrame extends BaseOp {
  readonly tag = 'Exit'
  constructor(
    readonly effect: Effect<any, any, any>,
    readonly f: (exit: AnyExit) => Effect<any, any, any>,
  ) {
    super()
  }
}

export class FlatMapFrame extends BaseOp {
  readonly tag = 'FlatMap'
  constructor(
    readonly effect: Effect<any, any, any>,
    readonly f: (a: any) => Effect<any, any, any>,
  ) {
    super()
  }

  static make(effect: Effect<any, any, any>, f: (a: any) => Effect<any, any, any>): Op {
    const op = effect.op
    const tag = op.tag

    if (tag === 'Map') {
      return FlatMapFrame.make(op.effect, flow(op.f, f))
    } else if (tag === 'Now') {
      return new Lazy(() => f(op.value))
    }

    return new FlatMapFrame(effect, f)
  }
}

export class OrElseFrame extends BaseOp {
  readonly tag = 'OrElse'

  constructor(
    readonly effect: Effect<any, any, any>,
    readonly f: (cause: Cause<any>) => Effect<any, any, any>,
  ) {
    super()
  }
}

export class InterruptFrame extends BaseOp {
  readonly tag = 'Interrupt'

  constructor(readonly effect: Effect<any, any, any>, readonly interruptStatus: boolean) {
    super()
  }
}
