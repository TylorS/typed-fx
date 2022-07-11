import { pipe } from 'hkt-ts'

import { Fx } from '../Fx'

import { success } from './FromExit'
import { FxInstruction } from './FxInstruction'
import { provide } from './Provide'

import type { Environment } from '@/Environment/Environment'
import type { OutputOf, Service } from '@/Service/Service'
import { InstanceOf } from '@/internal'

export class Access<
  in out R extends Service<any>,
  in out R2 extends Service<any>,
  out E,
  out A,
> extends FxInstruction<(env: Environment<R>) => Fx<R2, E, A>, R | R2, E, A> {}

export const access = <R extends Service<any>, R2 extends Service<any>, E, A>(
  f: (env: Environment<R>) => Fx<R2, E, A>,
): Fx<R | R2, E, A> => new Access(f)

export const environment = <R extends Service<any>>(): Fx<R, never, Environment<R>> =>
  access((r: Environment<R>) => success(r))

export const ask = <R extends typeof Service<any>>(
  service: R,
): Fx<InstanceOf<R>, never, OutputOf<InstanceOf<R>>> => access((e) => success(e.get(service)))

export const withService =
  <R extends typeof Service<any>>(service: R) =>
  <R2 extends Service<any>, E, A>(
    f: (service: OutputOf<InstanceOf<R>>) => Fx<R2, E, A>,
  ): Fx<InstanceOf<R> | R2, E, A> =>
    Fx(function* () {
      const a = yield* ask(service)

      return yield* f(a)
    }) as Fx<InstanceOf<R> | R2, E, A>

export const provideService =
  <R2 extends typeof Service<any>, I extends InstanceOf<R2>['implementation']>(
    Service: R2,
    implementation: I,
  ) =>
  <R extends Service<any>, E, A>(fx: Fx<R, E, A>): Fx<Exclude<R, InstanceOf<R2>>, E, A> =>
    access((environment) => pipe(fx, provide(environment.extend(new Service(implementation)))))
