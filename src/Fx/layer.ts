import { pipe } from 'hkt-ts'
import { isJust } from 'hkt-ts/Maybe'

import * as Fx from './Fx.js'
import { join } from './join.js'

import { Env, concat } from '@/Env/Env.js'
import { Live } from '@/Fiber/Fiber.js'
import { Layers } from '@/FiberRef/FiberRef.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import * as Layer from '@/Layer/Layer.js'
import { Closeable } from '@/Scope/Closeable.js'
import { Scope } from '@/Scope/Scope.js'

export function provideLayer<R2, E2, S>(layer: Layer.Layer<R2, E2, S>) {
  return <R, E, A>(fx: Fx.Fx<R | S, E, A>): Fx.Fx<Exclude<R | R2, S>, E | E2, A> =>
    Fx.access((existing: Env<Exclude<R | R2, S>>) =>
      pipe(
        Fx.getFiberContext,
        Fx.flatMap((c) => getOrMemoizeLayer(layer, c.scope)),
        Fx.flatMap(([e, scope]) =>
          pipe(fx, Fx.provide(concat(e)(existing as Env<R | R2>)), Fx.ensuring(scope.close)),
        ),
        Fx.provide(existing as Env<R | R2>),
      ),
    )
}

export function provideLayers<LAYERS extends ReadonlyArray<Layer.AnyLayer>>(...layers: LAYERS) {
  return <R, E, A>(
    fx: Fx.Fx<R | Layer.OutputOf<LAYERS[number]>, E, A>,
  ): Fx.Fx<
    Exclude<R | Layer.ResourcesOf<LAYERS[number]>, Layer.OutputOf<LAYERS[number]>>,
    E | Layer.ErrorsOf<LAYERS[number]>,
    A
  > =>
    Fx.access(
      (
        existing: Env<
          Exclude<R | Layer.ResourcesOf<LAYERS[number]>, Layer.OutputOf<LAYERS[number]>>
        >,
      ) =>
        pipe(
          Fx.getFiberContext,
          Fx.flatMap((c) => Fx.zipAll(layers.map((layer) => getOrMemoizeLayer(layer, c.scope)))),
          Fx.flatMap((envsAndScopes) => {
            const combined = envsAndScopes.reduce(
              (acc, [e]) => concat(e)(acc),
              existing as Env<R | Layer.ResourcesOf<LAYERS[number]>>,
            ) as Env<R | Layer.ResourcesOf<LAYERS[number]> | Layer.OutputOf<LAYERS[number]>>

            return pipeAll<typeof fx, Fx.IO<E, A>>(
              fx,
              Fx.provide(combined),
              ...envsAndScopes.map(([, scope]) => Fx.ensuring(scope.close)),
            )
          }),
          Fx.provide(existing as Env<R | Layer.ResourcesOf<LAYERS[number]>>),
        ),
    )
}

function getOrMemoizeLayer<R, E, A>(
  layer: Layer.Layer<R, E, A>,
  forkScope: Scope,
): Fx.Fx<R, never, readonly [Env<A>, Closeable]> {
  return Fx.Fx(function* () {
    const layers: ImmutableMap<Layer.LayerId, readonly [Live<any, Env<any>>, Closeable]> =
      yield* Fx.getFiberRef(Layers)
    const existing = layers.get(layer.id)

    if (isJust(existing)) {
      const [fiber, scope] = existing.value

      return [yield* Fx.fromExit(yield* fiber.exit), scope.fork()] as const
    }

    const scope = forkScope.fork()
    const fiber: Live<E, Env<A>> = yield* Fx.fork(Fx.uninterruptable(layer.build(scope)))

    yield* pipe(
      Layers,
      Fx.modifyFiberRef((layers) => [null, layers.set(layer.id, [fiber, scope])]),
    )

    return [yield* join(fiber), scope] as const
  })
}

// Internal implementation of pipe which is not type-safe but does not have a limit on the amount of functions that can be called.
function pipeAll<A, B>(value: A, ...fns: ReadonlyArray<(a: any) => any>): B {
  return fns.reduce((acc, fn) => fn(acc), value as any)
}
