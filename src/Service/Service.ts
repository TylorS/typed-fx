import { Tagged } from '@/Tagged/index.js'

/**
 * The Definition/ID of a Service
 */
export type Service<S> = Tagged<
  {
    readonly Service: S
  },
  symbol
>

/**
 * Construct a Service, the provided name is used for debugging purposes and is required.
 */
export const Service = <S>(name: string): Service<S> => Tagged<Service<S>>()(Symbol(name))

/**
 * Extract the output of a Service
 */
export type OutputOf<T> = [T] extends [Service<infer S>] ? S : never

/**
 * Format a Service's into a string.
 */
export function formatService<A>(service: Service<A>): string {
  return service.description as string
}
