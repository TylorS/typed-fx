import { pipe } from 'hkt-ts'

import { Fx } from '../Fx'

import { success } from './FromExit'
import { FxInstruction } from './FxInstruction'
import { provide } from './Provide'

import type { Env } from '@/Env/Env'
import * as Layer from '@/Layer/Layer'
import type { ServiceConstructor } from '@/Service/Service'
import { InstanceOf } from '@/internal'

export class Access<in out R, in out R2, out E, out A> extends FxInstruction<
  (env: Env<R>) => Fx<R2, E, A>,
  R | R2,
  E,
  A
> {}

export const access = <R = never, R2 = never, E = never, A = any>(
  f: (env: Env<R>) => Fx<R2, E, A>,
): Fx<R | R2, E, A> => new Access(f)

export const get = <R>(): Fx<R, never, Env<R>> => access((r: Env<R>) => success(r))

export const ask = <R extends ServiceConstructor<any>>(
  service: R,
): Fx<InstanceOf<R>, never, InstanceOf<R>> => access((e) => e.get(service))

export const asks =
  <R extends ServiceConstructor<any>>(service: R) =>
  <A>(f: (i: InstanceOf<R>) => A): Fx<InstanceOf<R>, never, A> =>
    access((e) =>
      Fx(function* () {
        return f(yield* e.get(service))
      }),
    )

export const withService =
  <R extends ServiceConstructor<any>>(service: R) =>
  <R2, E, A>(f: (service: InstanceOf<R>) => Fx<R2, E, A>): Fx<InstanceOf<R> | R2, E, A> =>
    Fx(function* () {
      const a = yield* ask(service)

      return yield* f(a)
    })

export const provideService =
  <C extends ServiceConstructor, S extends InstanceOf<C>>(Service: C, implementation: S) =>
  <R, E, A>(fx: Fx<R | InstanceOf<C>, E, A>): Fx<Exclude<R, InstanceOf<C>>, E, A> =>
    access((environment) =>
      pipe(fx, provide(environment.addService(Service, implementation) as Env<R | InstanceOf<C>>)),
    )

export const provideLayer =
  <L extends Layer.AnyLayer>(layer: L) =>
  <R, E, A>(fx: Fx<R | Layer.ServiceOf<L>, E, A>): Fx<Exclude<R, Layer.ServiceOf<L>>, E, A> =>
    access((environment) => pipe(fx, provide(environment.addLayer<any>(layer))))

export const provideLayers =
  <Layers extends ReadonlyArray<Layer.AnyLayer>>(...layers: Layers) =>
  <R, E, A>(
    fx: Fx<R | Layer.ServiceOf<Layers[number]>, E, A>,
  ): Fx<Exclude<R, Layer.ServiceOf<Layers[number]>>, E, A> =>
    access((environment) =>
      pipe(
        fx,
        provide(
          layers.reduce((s, l) => s.addLayer(l), environment) as Env<
            R | Layer.ServiceOf<Layers[number]>
          >,
        ),
      ),
    )

export const refreshLayer = <L extends Layer.AnyLayer>(layer: L) =>
  access((env) => env.refreshLayer(layer.service))
