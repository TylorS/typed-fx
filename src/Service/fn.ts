import { ArgsOf } from 'hkt-ts'

import { Id, InstanceOf } from './Id.js'
import { Service } from './Service.js'
import { tagged } from './tagged.js'

import type { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '@/Fx/Fx.js'

export const fn =
  <F extends (...args: any) => AnyFx>() =>
  <ServiceName extends string>(name: ServiceName) =>
    class Fn extends tagged(name) {
      constructor(readonly f: F) {
        super()
      }

      static apply<
        T extends {
          readonly id: () => Service<any>
          new (...args: any): { readonly f: F }
        } & { readonly with: typeof Id['with'] },
      >(
        this: T,
        ...args: ArgsOf<F>
      ): Fx<
        InstanceOf<T> | ResourcesOf<ReturnType<F>>,
        ErrorsOf<ReturnType<F>>,
        OutputOf<ReturnType<F>>
      > {
        return this.with((s) => s.f(...(args as any)))
      }

      static make<
        T extends {
          readonly id: () => Service<any>
          new (...args: any): { readonly f: F }
        },
      >(this: T, fn: F): InstanceOf<T> {
        return new this(fn) as InstanceOf<T>
      }
    }
