import { flow } from 'hkt-ts'

import { Queue } from './Queue.js'
import { local } from './local.js'
import { localFx } from './localFx.js'
import { map } from './map.js'
import { mapFx } from './mapFx.js'

import * as Fx from '@/Fx/Fx.js'

export const dimap = <A, B, C, D>(f: (a: A) => B, g: (c: C) => D) =>
  flow(map(g), local(f)) as {
    <R, E, R2, E2>(q: Queue<R, E, B, R2, E2, C>): Queue<R, E, A, R2, E2, D>
  }

export const dimapFx = <A, B, R3, E3, C, R4, E4, D>(
  f: (a: A) => Fx.Fx<R3, E3, B>,
  g: (c: C) => Fx.Fx<R4, E4, D>,
) =>
  flow(mapFx(g), localFx(f)) as {
    <R, E, R2, E2>(q: Queue<R, E, B, R2, E2, C>): Queue<R | R3, E | E3, A, R2 | R4, E2 | E4, D>
  }
