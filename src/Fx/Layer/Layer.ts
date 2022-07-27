import { AnyInstruction, Fx, ask } from '../Fx/Fx.js'
import { ErrorsFromInstruction, ResourcesFromInstruction } from '../Fx/Instruction/Instruction.js'

import { Scope } from '@/Scope/Scope.js'
import { Service } from '@/Service/index.js'

export interface Layer<R, E, A> {
  readonly service: Service<A>
  readonly build: Fx<R | Scope, E, A>
}

export function Layer<A, R, E>(service: Service<A>, build: Fx<R | Scope, E, A>): Layer<R, E, A> {
  return {
    service,
    build,
  }
}

export function make<A>(service: Service<A>) {
  return <Y extends AnyInstruction>(
    f: (scope: Scope) => Generator<Y, A>,
  ): Layer<ResourcesFromInstruction<Y>, ErrorsFromInstruction<Y>, A> =>
    Layer(
      service,
      Fx(function* () {
        return yield* f(yield* ask(Scope))
      }),
    )
}
