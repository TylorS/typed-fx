import * as TSemaphore from '@effect/core/stm/TSemaphore'

import { transform } from './transform.js'

export const withPermit = (self: TSemaphore.TSemaphore) => transform(TSemaphore.withPermit(self))

export const withPermits = (permits: number) => (self: TSemaphore.TSemaphore) =>
  transform(TSemaphore.withPermits(permits)(self))
