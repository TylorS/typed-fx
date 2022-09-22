import { pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/index.js'
import { Layer } from '@/Layer/Layer.js'
import { Service } from '@/Service/Service.js'

export function provide<R>(env: Env<R>) {
  return <E, A>(stream: Stream<R, E, A>): Stream<never, E, A> =>
    Stream((sink, scheduler, context) => Fx.provide(env)(stream.fork(sink, scheduler, context)))
}

export function provideService<S, I extends S>(service: Service<S>, impl: I) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<Exclude<R, S>, E, A> =>
    Stream((sink, scheduler, context) =>
      pipe(stream.fork(sink, scheduler, context), Fx.provideService(service, impl)),
    )
}

export function provideLayer<R2, E2, S>(layer: Layer<R2, E2, S>) {
  return <R, E, A>(stream: Stream<R | S, E, A>): Stream<Exclude<R | R2, S>, E | E2, A> =>
    Stream((sink, scheduler, context) =>
      pipe(
        Fx.getFiberContext,
        Fx.flatMap((c) => stream.fork(sink, scheduler, c.fork())),
        Fx.provideLayer(layer),
        Fx.orElseCause((cause) => Fx.fork(sink.error(cause))),
        Fx.flatMap((f) => Fx.join(f)),
        Fx.forkInContext(context),
      ),
    )
}
