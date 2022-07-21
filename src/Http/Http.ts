import { IO } from '@/Fx/Fx'
import { Service } from '@/Service/Service'

export class Http extends Service {
  constructor(
    readonly call: (urlOrPathname: string | URL, init?: RequestInit) => IO<HttpError, Response>,
  ) {
    super()
  }
}

export class HttpError extends Error {
  constructor(readonly request: Request, readonly message: string, readonly cause: Error) {
    super(message, { cause })
  }
}
