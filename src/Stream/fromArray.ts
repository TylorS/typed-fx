import { pipe } from 'hkt-ts'
import * as NEA from 'hkt-ts/NonEmptyArray'

import { fromCallback } from './fromCallback.js'

import { makeParallelIdentity, unexpected } from '@/Cause/Cause.js'

const foldCauses = NEA.foldLeft(makeParallelIdentity<never>())

export function fromArray<A>(array: ReadonlyArray<A>) {
  return fromCallback<never, A>(async ({ event, error, end }) => {
    const results = await Promise.allSettled(array.map(event))
    const failedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    if (NEA.isNonEmpty(failedResults)) {
      const cause = pipe(
        failedResults,
        NEA.map((result) => unexpected(result.reason)),
        foldCauses,
      )

      await error(cause)
    } else {
      await end()
    }
  })
}
