import { deepEqual, ok } from 'assert'
import { dirname } from 'path'

import { isJust } from 'hkt-ts/Maybe'

import { getCurrentStackFrame, getStackFrames } from './getStackFrames.js'

const filename = new URL(import.meta.url).pathname
const root = dirname(dirname(dirname(filename))) + '/'

describe(filename, function () {
  describe(getStackFrames.name, function () {
    it('returns stack frames from an error', function test() {
      const frame = getCurrentStackFrame() // Provide this for some consistency in the return

      ok(isJust(frame))

      deepEqual(
        { ...frame.value, file: frame.value.file.replace(root, '') },
        {
          tag: 'Runtime',
          file: 'src/StackFrame/getStackFrames.ts',
          method: 'getCurrentStackFrame',
          line: 49,
          column: 11,
        },
      )
    })
  })
})
