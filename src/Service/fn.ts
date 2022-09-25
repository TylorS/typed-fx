import { ArgsOf } from 'hkt-ts'

import { Id, InstanceOf } from './Id.js'
import { Service } from './Service.js'
import { tagged } from './tagged.js'

import * as Fx from '@/Fx/Fx.js'

export const fn =
  <F extends (...args: any) => Fx.AnyFx>() =>
  <ServiceName extends string>(name: ServiceName) =>
    class Fn extends tagged(name) {
      constructor(readonly f: F) {
        super()
      }

      static apply<
        T extends {
          readonly id: () => Service<any>
          new (f: F, ...args: any): { readonly f: F }
        } & { readonly with: typeof Id['with'] },
      >(
        this: T,
        ...args: ArgsOf<F>
      ): Fx.Fx<
        InstanceOf<T> | Fx.ResourcesOf<ReturnType<F>>,
        Fx.ErrorsOf<ReturnType<F>>,
        Fx.OutputOf<ReturnType<F>>
      > {
        return this.with((s) => s.f(...Array.from(args)))
      }

      static make<
        T extends {
          readonly id: () => Service<any>
          new (f: F, ...args: any): { readonly f: F }
        },
      >(this: T, f: F, ...args: ConstructorParameters<T>): InstanceOf<T> {
        return new this(f, ...Array.from(args)) as InstanceOf<T>
      }
    }
