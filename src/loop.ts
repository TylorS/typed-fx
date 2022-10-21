import { Fx } from './Fx.js'
import { Sink } from './Sink.js'

export function loop<A, B, C>(seed: A, f: (a: A, b: B) => readonly [C, A]) {
  return <R, E, E1>(fx: Fx<R, E, B, E1>): Fx<R, E, C, E1> => new LoopFx(fx, seed, f)
}

export function scan<A, B>(seed: A, f: (a: A, b: B) => A) {
  return loop(seed, (a, b: B) => {
    const x = f(a, b)
    return [x, x]
  })
}

class LoopFx<R, E, E1, A, B, C> implements Fx<R, E, C, E1> {
  protected acc: A

  constructor(
    readonly fx: Fx<R, E, B, E1>,
    readonly seed: A,
    readonly f: (a: A, b: B) => readonly [C, A],
  ) {
    this.acc = seed
  }

  readonly run: Fx<R, E, C, E1>['run'] = (sink) =>
    this.fx.run(
      Sink(
        (b) => {
          const [c, a] = this.f(this.acc, b)
          this.acc = a
          return sink.event(c)
        },
        sink.error,
        sink.end,
      ),
    )
}
