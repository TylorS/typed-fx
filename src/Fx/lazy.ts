import { AnyFx, ErrorsOf, Fx, Of, OutputOf, ResourcesOf } from './Fx'
import { success } from './InstructionSet/FromExit'

export const lazy = <F extends AnyFx>(f: () => F): Fx<ResourcesOf<F>, ErrorsOf<F>, OutputOf<F>> =>
  Fx(function* () {
    return yield* f()
  })

export const fromLazy = <A>(f: () => A) => lazy<Of<A>>(() => success(f()))
