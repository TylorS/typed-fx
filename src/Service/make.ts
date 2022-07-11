import { OutputOf, Service } from './Service'

import { Fx } from '@/Fx/Fx'
import { ask } from '@/Fx/InstructionSet/Access'
import { Layer, LayerOptions, make as makeLayer } from '@/Layer/Layer'
import { InstanceOf } from '@/internal'

export function make<A>() {
  return function <Name extends string>(name: Name) {
    return class Service_ extends Service<A> {
      override readonly name: Name = name

      static get<S>(this: S): Fx<InstanceOf<S>, never, A> {
        return ask(this)
      }

      static implement<S, R extends Service<any>, E>(
        this: S,
        provider: Fx<R, E, OutputOf<InstanceOf<S>>>,
        options?: Partial<LayerOptions<S>>,
      ): Layer<S, R, E> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this

        return makeLayer<S>(
          this,
          Fx(function* () {
            return new (that as any)(yield* provider)
          }),
          options,
        )
      }
    }
  }
}
