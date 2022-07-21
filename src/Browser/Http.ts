import { failure } from '@/Fx/InstructionSet/FromExit'
import { fromPromise } from '@/Fx/fromPromise'
import { Http, HttpError } from '@/Http/Http'

export const Fetch = Http.layerOf(
  new Http((url, init) => {
    const request = new Request(url, init)

    return fromPromise(
      (signal) => fetch(request, { signal }),
      (e) =>
        failure(
          new HttpError(
            request,
            `Fetch Request Failed`,
            e instanceof Error ? e : new Error(`${JSON.stringify(e)}`),
          ),
        ),
    )
  }),
)
