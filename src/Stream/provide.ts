import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/index.js'
import { Layer } from '@/Layer/Layer.js'
import { Service } from '@/Service/Service.js'
import { Sink } from '@/Sink/Sink.js'

export function provide<R>(env: Env<R>) {
  return <E, A>(stream: Stream<R, E, A>): Stream<never, E, A> =>
    Stream(flow(stream.fork, Fx.provideSome(env)))
}

export function provideService<S, I extends S>(service: Service<S>, impl: I) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<Exclude<R, S>, E, A> =>
    Stream(flow(stream.fork, Fx.provideService(service, impl)))
}

export function provideLayer<R2, E2, S>(layer: Layer<R2, E2, S>) {
  return <R, E, A>(stream: Stream<R | S, E, A>): Stream<Exclude<R | R2, S>, E | E2, A> =>
    Stream<Exclude<R | R2, S>, E | E2, A>(<R3, E3>(sink: Sink<E | E2, A, R3, E3>) => {
      return pipe(
        stream.fork(sink),
        Fx.provideLayer({
          service: layer.service,
          build: flow(
            layer.build,
            Fx.orElseCause((e) =>
              pipe(
                console.log(e),
                () => e,
                sink.error,
                Fx.flatMap(() => Fx.never),
              ),
            ),
          ),
        }),
        Fx.flatJoin,
        Fx.fork,
      )
    })
}
