import * as Duration from "@effect/data/Duration"
import { at } from "@typed/fx/internal/constructor"
import { fromArray } from "@typed/fx/internal/conversion"
import { mergeAll } from "@typed/fx/internal/operator"
import {
  since,
  skip,
  skipAfter,
  skipUntil,
  skipWhile,
  slice,
  take,
  takeUntil,
  takeWhile
} from "@typed/fx/internal/slicing"
import { testCollectAll } from "@typed/fx/test/util"

describe("slicing", () => {
  describe(since.name, () => {
    testCollectAll(
      "skips events in self until the first event in signal",
      since(
        mergeAll(
          at(1, Duration.millis(100)),
          at(2, Duration.millis(200)),
          at(3, Duration.millis(300))
        ),
        at(null, Duration.millis(150))
      ),
      [2, 3]
    )
  })

  describe(skip.name, () => {
    testCollectAll(
      "skips the first n events",
      skip(
        fromArray([1, 2, 3, 4, 5]),
        2
      ),
      [3, 4, 5]
    )
  })

  describe(skipAfter.name, () => {
    testCollectAll(
      "skips events after the predicate is matched",
      skipAfter(
        mergeAll(
          at(1, Duration.millis(100)),
          at(2, Duration.millis(200)),
          at(3, Duration.millis(300))
        ),
        (x) => x > 1
      ),
      [1]
    )
  })

  describe(skipUntil.name, () => {
    testCollectAll(
      "skips events until the predicate is matched",
      skipUntil(
        mergeAll(
          at(1, Duration.millis(100)),
          at(2, Duration.millis(200)),
          at(3, Duration.millis(300))
        ),
        (x) => x > 1
      ),
      [2, 3]
    )
  })

  describe(skipWhile.name, () => {
    testCollectAll(
      "skips events while the predicate is matched",
      skipWhile(
        mergeAll(
          at(1, Duration.millis(100)),
          at(2, Duration.millis(200)),
          at(3, Duration.millis(300))
        ),
        (x) => x < 3
      ),
      [3]
    )
  })

  describe(slice.name, () => {
    testCollectAll(
      "skips/takes values",
      slice(
        fromArray([1, 2, 3, 4, 5]),
        2,
        2
      ),
      [3, 4]
    )
  })

  describe(take.name, () => {
    testCollectAll(
      "skips the first n events",
      take(
        fromArray([1, 2, 3, 4, 5]),
        2
      ),
      [1, 2]
    )
  })

  describe(takeUntil.name, () => {
    testCollectAll(
      "takes events until the predicate is matched",
      takeUntil(
        mergeAll(
          at(1, Duration.millis(100)),
          at(2, Duration.millis(200)),
          at(3, Duration.millis(300))
        ),
        (x) => x > 1
      ),
      [1]
    )
  })

  describe(takeWhile.name, () => {
    testCollectAll(
      "takes events while the predicate is matched",
      takeWhile(
        mergeAll(
          at(1, Duration.millis(100)),
          at(2, Duration.millis(200)),
          at(3, Duration.millis(300))
        ),
        (x) => x < 3
      ),
      [1, 2]
    )
  })
})
