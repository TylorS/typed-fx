import { dirname } from 'path'

import { ExclusiveSuiteFunction, Suite, SuiteFunction } from 'mocha'

declare global {
  export interface ImportMeta {
    readonly env: {
      readonly url: string
    }
  }
}

export const getFileName = (url: string) => new URL(url).pathname
export const getDirname = (url: string) => dirname(new URL(url).pathname)

export const testSuite: SuiteFunction = Object.assign(
  (title: string, fn?: (this: Suite) => void) =>
    fn ? describe(getFileName(title), fn) : describe(getFileName(title)),
  {
    only: ((title: string, fn: (this: Suite) => void) =>
      describe.only(getFileName(title), fn)) as ExclusiveSuiteFunction,
    skip: (title: string, fn: (this: Suite) => void) => describe.skip(getFileName(title), fn),
  },
)
