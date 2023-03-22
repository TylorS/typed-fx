import { fail, succeed } from "@typed/fx"
import { Exit } from "@typed/fx/internal/_externals"
import { exit } from "@typed/fx/internal/error/exit"
import { map, mergeAll } from "@typed/fx/internal/operator"
import { testCollectAll } from "@typed/fx/test/util"

describe(__filename, () => {
  describe(exit.name, () => {
    testCollectAll(
      "captures all errors into an Exit",
      map(
        exit(
          mergeAll(succeed(1), fail(2))
        ),
        Exit.unannotate
      ),
      [Exit.succeed(1), Exit.fail(2)]
    )
  })
})
