import { pipe } from 'hkt-ts'
import { Left } from 'hkt-ts/Either'

import * as Fx from './Fx.js'

import { Delay, Time } from '@/Time/index.js'

export const sleep = (delay: Delay): Fx.Of<Time> =>
  pipe(
    Fx.getFiberContext,
    Fx.flatMap((context) =>
      Fx.async<never, never, Time>((cb) => {
        const disposable = context.platform.timer.setTimer((t) => cb(Fx.now(t)), delay)

        return Left(Fx.fromLazy(() => disposable.dispose()))
      }),
    ),
  )
