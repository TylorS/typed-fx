import { deepStrictEqual, ok } from 'assert'
import { dirname } from 'path'

import { isJust } from 'hkt-ts/Maybe'

import { getCurrentStackFrame, getStackFrames } from './getStackFrames'

const root = dirname(dirname(__dirname)) + '/'
describe(__filename, () => {
  describe(getStackFrames.name, () => {
    it('returns stack frames from an error', () => {
      const frame = getCurrentStackFrame(this)

      ok(isJust(frame))

      deepStrictEqual(
        { ...frame.value, file: frame.value.file.replace(root, '') },
        {
          file: 'src/StackFrame/getStackFrames.ts',
          method: 'getCurrentStackFrame',
          column: 11,
          line: 48,
        },
      )
    })
  })
})
