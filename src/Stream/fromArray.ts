import { fromCallback } from './fromCallback.js'

export function fromArray<A>(array: ReadonlyArray<A>) {
  return fromCallback<never, A>(async ({ event, end }) => {
    await Promise.all(array.map(event))
    await end()
  })
}
