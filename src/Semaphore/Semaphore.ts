import { Of } from '@/Fx/Fx'

export abstract class Semaphore<A> {
  constructor(readonly maxPermits: number) {}
}

export class Acquisition {
  constructor(readonly acquire: Of<void>, readonly release: Of<void>) {}
}
