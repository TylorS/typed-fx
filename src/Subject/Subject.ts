import { fromScope } from '@/Fiber/fromScope.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { fromLazy } from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'
import { Stream } from '@/Stream/Stream.js'
import { MulticastSink } from '@/Stream/multicast.js'

export class Subject<R, E, A>
  extends MulticastSink<E, A>
  implements Stream<R, E, A>, Sink<E, A, unknown>
{
  fork<E3>(sink: Sink<E, A, E3>, scheduler: Scheduler, context: FiberContext<FiberId.Live>) {
    return fromLazy(() => {
      const observer = {
        sink,
        scheduler,
        context,
      }
      this.observers.push(observer)

      context.scope.ensuring(() =>
        fromLazy(() => this.observers.splice(this.observers.indexOf(observer), 1)),
      )

      return fromScope(context.id, context.fiberRefs, context.scope)
    })
  }
}

export namespace Subject {
  export type Of<A> = Subject<never, never, A>
  export type IO<E, A> = Subject<never, E, A>
  export type RIO<R, A> = Subject<R, never, A>

  export const make = <A>(): Subject.Of<A> => new Subject()
}

export type Of<A> = Subject.Of<A>
export type IO<E, A> = Subject.IO<E, A>
export type RIO<R, A> = Subject.RIO<R, A>

export const make = Subject.make
