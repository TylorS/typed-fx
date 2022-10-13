import { isRight } from 'hkt-ts/Either'
import { isJust } from 'hkt-ts/Maybe'

import { None } from './Supervisor.js'

export const inheritFiberRefs = None.extend({
  onEnd: () => (fiber, exit) => {
    const parentContext = fiber.context.parent

    // Merge FiberRefs upon successful completion
    if (isRight(exit) && isJust(parentContext)) {
      parentContext.value.fiberRefs.locals.join(fiber.context.fiberRefs.locals)
    }
  },
})
