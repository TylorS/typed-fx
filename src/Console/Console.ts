import { Service } from '@/Service/Service'

export class Console extends Service {
  constructor(readonly console: globalThis.Console) {
    super()
  }
}

export const error = (...msgs: readonly any[]) => Console.asks((c) => c.console.error(...msgs))
export const warn = (...msgs: readonly any[]) => Console.asks((c) => c.console.warn(...msgs))
export const info = (...msgs: readonly any[]) => Console.asks((c) => c.console.info(...msgs))
export const log = (...msgs: readonly any[]) => Console.asks((c) => c.console.log(...msgs))
export const debug = (...msgs: readonly any[]) => Console.asks((c) => c.console.debug(...msgs))

export const count = (label?: string) => Console.asks((c) => c.console.count(label))
export const countReset = (label?: string) => Console.asks((c) => c.console.countReset(label))
export const profile = (label?: string) => Console.asks((c) => c.console.profile(label))
export const profileEnd = (label?: string) => Console.asks((c) => c.console.profileEnd(label))
export const time = (label?: string) => Console.asks((c) => c.console.time(label))
export const timeEnd = (label?: string) => Console.asks((c) => c.console.timeEnd(label))
