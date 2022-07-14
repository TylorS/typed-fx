import { NonNegativeInteger } from 'hkt-ts/number'

import { Semaphore, acquire } from '@/Semaphore/Semaphore'

export class FiberExecutor {
  constructor(
    readonly semaphore: Semaphore = new Semaphore(NonNegativeInteger(Number.MAX_SAFE_INTEGER)),
  ) {}

  readonly run = acquire(this.semaphore)
}
