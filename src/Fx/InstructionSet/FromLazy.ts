import { Lazy } from 'hkt-ts/function'

import { AnyFx, ErrorsOf, Of, OutputOf, ResourcesOf } from '../Fx'

import { success } from './FromExit'
import { FxInstruction } from './FxInstruction'

export class LazyFx<F extends AnyFx> extends FxInstruction<
  Lazy<F>,
  ResourcesOf<F>,
  ErrorsOf<F>,
  OutputOf<F>
> {}

export const lazy = <F extends AnyFx>(f: () => F): F => new LazyFx<F>(f) as unknown as F

export const fromLazy = <A>(f: () => A) => lazy<Of<A>>(() => success(f()))
