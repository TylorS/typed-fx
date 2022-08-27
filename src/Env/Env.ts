import { pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'

// eslint-disable-next-line import/no-cycle
import * as FiberRef from '@/FiberRef/index.js'
// eslint-disable-next-line import/no-cycle
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Fx, Of, fromExit } from '@/Fx/Fx.js'
// eslint-disable-next-line import/no-cycle
import { join } from '@/Fx/join.js'
import { Service } from '@/Service/Service.js'

export interface Env<R> {
  readonly get: <S extends R>(service: Service<S>) => Of<S>
}

export function Env<R>(fiberRefs: FiberRefs.FiberRefs): Env<R> {
  return {
    get: get(fiberRefs.fork()), // Always use a snapshot of the FiberRefs to avoid mutability problems.
  }
}

function get(fiberRefs: FiberRefs.FiberRefs) {
  return <S>(id: Service<S>): Of<S> => {
    return Fx(function* () {
      const service = pipe(
        fiberRefs,
        FiberRefs.maybeGetFiberRefStack(FiberRef.Services),
        Maybe.flatMap((s) => s.value.get(id)),
      )

      if (Maybe.isJust(service)) {
        return service.value as S
      }

      const layers = FiberRefs.maybeGetFiberRefStack(FiberRef.Layers)(fiberRefs)
      const layer = pipe(
        layers,
        Maybe.flatMap((s) => s.value.get(id)),
      )

      if (Maybe.isNothing(layers) || Maybe.isNothing(layer)) {
        throw new Error(`Unable to find Layer or Service for ${id.description}`)
      }

      const [makeFiber, currentFiber] = layer.value

      if (Maybe.isJust(currentFiber)) {
        return (yield* fromExit(yield* currentFiber.value.exit)) as S
      }

      const fiber = makeFiber()

      FiberRefs.setFiberRef(
        FiberRef.Layers,
        layers.value.value.set(id, [makeFiber, Maybe.Just(fiber)]),
      )(fiberRefs)

      return (yield* join(fiber)) as S
    })
  }
}
