import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Atomic } from '@/Atomic/Atomic'

// `setInterval` is limited to take delays which are 32-bit values
const MAX_SET_INTERVAL_VALUE = 2 ** 31 - 1

export const keepAlive = () => {
  const interval = new Atomic<ReturnType<typeof setTimeout> | null>(null, Strict)

  const ping = () => {
    if (interval.get === null)
      interval.set(
        setInterval(() => {
          // Keep the process alive
        }, MAX_SET_INTERVAL_VALUE),
      )
  }

  const clear = () => {
    const i = interval.get

    if (i !== null) {
      clearInterval(i)

      interval.set(null)
    }
  }

  return [ping, clear] as const
}
