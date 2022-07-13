import { NonNegativeInteger } from 'hkt-ts/number'

import type { FinalizationStrategy } from './Finalizer'

export function finalizationStrategyToConcurrency(
  strategy: FinalizationStrategy,
): NonNegativeInteger {
  if (strategy.strategy === 'Sequential') {
    return NonNegativeInteger(1)
  }

  if (strategy.strategy === 'Concurrent') {
    return NonNegativeInteger(Infinity)
  }

  return strategy.concurrency
}
