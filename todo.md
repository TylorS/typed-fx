# TODOS

## Most.js API

- [x] Empty
- [ ] periodic
- [x] continueWith
- [x] startWith
- [ ] scan
- [ ] loop
- [ ] zipItems
- [ ] withItems
- [ ] switchMap
- [ ] flatMapConcurrently
- [ ] combine + combineAll
- [ ] zip + zipAll
- [ ] snapshot + sample
- [ ] slice + take + skip
- [ ] takeWhile
- [ ] skipWhile
- [ ] skipAfter
- [ ] takeUntil
- [ ] until
- [ ] since
- [ ] during
- [ ] throttle
- [ ] debounce

## Evaluate if there's a reasonable equivalent in Fx

- [x] Effect.absolve
- [x] Effect.absorb
- [x] Effect.absorbWith
- [x] Effect.bind
- [x] Effect.bindValue
- [ ] Effect.catchAllCause
- [ ] Effect.catchAllDefect
- [ ] Effect.catchSome
- [ ] Effect.catchSomeCause
- [ ] Effect.catchSomeDefect
- [ ] Effect.catchTag
- [ ] Effect.catchTags
- [ ] Effect.cause
- [ ] Effect.checkInterruptible
- [ ] Effect.clock
- [ ] Effect.clockWith
- [ ] Effect.collect
- [ ] Effect.collectAll
- [ ] Effect.collectAllDiscard
- [ ] Effect.collectAllPar
- [ ] Effect.collectAllParDiscard
- [ ] Effect.collectAllSuccesses
- [ ] Effect.collectAllSuccessesPar
- [ ] Effect.collectAllWith
- [ ] Effect.collectAllWithEffect
- [ ] Effect.collectAllWithPar
- [ ] Effect.collectFirst
- [ ] Effect.collectPar
- [ ] Effect.collectWhile
- [ ] Effect.daemonChildren
- [x] Effect.delay
- [ ] Effect.descriptor
- [ ] Effect.descriptorWith
- [ ] Effect.either
- [ ] Effect.ensuring
- [ ] Effect.ensuringChild
- [ ] Effect.ensuringChildren
- [ ] Effect.eventually
- [ ] Effect.exists
- [ ] Effect.existsPar
- [x] Effect.exit
- [x] Effect.fail
- [x] Effect.failCause
- [ ] Effect.failCauseSync
- [ ] Effect.failSync
- [ ] Effect.filter
- [ ] Effect.filterNot
- [ ] Effect.filterNotPar
- [ ] Effect.filterOrDie
- [ ] Effect.filterOrDieMessage
- [ ] Effect.filterOrElse
- [ ] Effect.filterOrElseWith
- [ ] Effect.filterOrElseWith
- [ ] Effect.filterOrFail
- [ ] Effect.filterPar
- [ ] Effect.find
- [ ] Effect.firstSuccessOf
- [ ] Effect.flattenErrorOption
- [ ] Effect.flip
- [ ] Effect.flipWith
- [ ] Effect.forAll
- [ ] Effect.forEach
- [ ] Effect.forEachDiscard
- [ ] Effect.forEachEffect
- [ ] Effect.forEachExec
- [ ] Effect.forEachOption
- [ ] Effect.forEachPar
- [ ] Effect.forEachParDiscard
- [ ] Effect.forEachParWithIndex
- [ ] Effect.forEachWithIndex
- [ ] Effect.forever
- [ ] Effect.fork
- [ ] Effect.forkAll
- [ ] Effect.forkAllDiscard
- [ ] Effect.forkDaemon
- [ ] Effect.forkIn
- [ ] Effect.forkScoped
- [ ] Effect.forkWithErrorHandler
- [x] Effect.fromEither
- [x] Effect.fromEitherCause
- [x] Effect.fromFiber
- [x] Effect.fromFiberEffect
- [ ] Effect.getFiberRefs
- [ ] Effect.getOrFail
- [ ] Effect.getOrFailDiscard
- [ ] Effect.getOrFailWith
- [ ] Effect.head
- [ ] Effect.ifEffect
- [ ] Effect.ignore
- [ ] Effect.ignoreLogged
- [ ] Effect.inheritFiberRefs
- [ ] Effect.interrupt
- [ ] Effect.interruptWith
- [ ] Effect.interruptible
- [ ] Effect.interruptibleMask
- [ ] Effect.intoDeferred
- [ ] Effect.isEffect
- [ ] Effect.isFailure
- [ ] Effect.isSuccess
- [ ] Effect.iterate
- [ ] Effect.left
- [ ] Effect.leftWith
- [ ] Effect.log
- [ ] Effect.logAnnotate
- [ ] Effect.logAnnotations
- [ ] Effect.logDebug
- [ ] Effect.logDebugCause
- [ ] Effect.logDebugCauseMessage
- [ ] Effect.logError
- [ ] Effect.logErrorCause
- [ ] Effect.logErrorCauseMessage
- [ ] Effect.logFatal
- [ ] Effect.logFatalCause
- [ ] Effect.logFatalCauseMessage
- [ ] Effect.logInfo
- [ ] Effect.logInfoCause
- [ ] Effect.logInfoCauseMessage
- [ ] Effect.logSpan
- [ ] Effect.logTrace
- [ ] Effect.logTraceCause
- [ ] Effect.logTraceCauseMessage
- [ ] Effect.logWarning
- [ ] Effect.logWarningCause
- [ ] Effect.logWarningCauseMessage
- [ ] Effect.loop
- [ ] Effect.loopDiscard
- [ ] Effect.makeSemaphore
- [ ] Effect.mapAccum
- [ ] Effect.mapBoth
- [ ] Effect.mapError
- [ ] Effect.mapErrorCause
- [ ] Effect.mapTryCatch
- [ ] Effect.matchCause
- [ ] Effect.matchCauseEffect
- [ ] Effect.matchEffect
- [ ] Effect.memoize
- [ ] Effect.memoizeFunction
- [ ] Effect.negate
- [ ] Effect.never
- [ ] Effect.none
- [ ] Effect.noneOrFail
- [ ] Effect.noneOrFailWith
- [ ] Effect.onDone
- [ ] Effect.onDoneCause
- [ ] Effect.onError
- [ ] Effect.onExit
- [ ] Effect.onInterrupt
- [ ] Effect.once
- [ ] Effect.option
- [ ] Effect.orDie
- [ ] Effect.orDieWith
- [ ] Effect.orElse
- [ ] Effect.orElseEither
- [ ] Effect.orElseFail
- [ ] Effect.orElseOptional
- [ ] Effect.orElseSucceed
- [ ] Effect.parallelErrors
- [ ] Effect.parallelFinalizers
- [ ] Effect.partition
- [ ] Effect.partitionPar
- [ ] Effect.patchFiberRefs
- [ ] Effect.provideContext
- [ ] Effect.provideLayer
- [ ] Effect.provideService
- [ ] Effect.provideServiceEffect
- [ ] Effect.provideSomeLayer
- [ ] Effect.race
- [ ] Effect.raceAll
- [ ] Effect.raceAwait
- [ ] Effect.raceEither
- [ ] Effect.raceFibersWith
- [ ] Effect.raceFirst
- [ ] Effect.raceWith
- [ ] Effect.random
- [ ] Effect.randomWith
- [ ] Effect.reduce
- [ ] Effect.reduceAll
- [ ] Effect.reduceAllPar
- [ ] Effect.reduceRight
- [ ] Effect.reduceWhile
- [ ] Effect.refineOrDie
- [ ] Effect.refineOrDieWith
- [ ] Effect.refineTagOrDie
- [ ] Effect.refineTagOrDieWith
- [ ] Effect.reject
- [ ] Effect.rejectEffect
- [ ] Effect.repeat
- [ ] Effect.repeatN
- [ ] Effect.repeatOrElse
- [ ] Effect.repeatOrElseEither
- [ ] Effect.repeatUntil
- [ ] Effect.repeatUntilEffect
- [ ] Effect.repeatUntilEquals
- [ ] Effect.repeatWhile
- [ ] Effect.repeatWhileEffect
- [ ] Effect.repeatWhileEquals
- [ ] Effect.replicate
- [ ] Effect.replicateEffect
- [ ] Effect.replicateEffectDiscard
- [ ] Effect.resurrect
- [ ] Effect.retry
- [ ] Effect.retryN
- [ ] Effect.retryOrElse
- [ ] Effect.retryOrElseEither
- [ ] Effect.retryUntil
- [ ] Effect.retryUntilEffect
- [ ] Effect.retryUntilEquals
- [ ] Effect.retryWhile
- [ ] Effect.retryWhileEffect
- [ ] Effect.retryWhileEquals
- [ ] Effect.right
- [ ] Effect.rightWith
- [ ] Effect.runCallback
- [ ] Effect.runFork
- [ ] Effect.runPromise
- [ ] Effect.runPromiseEither
- [ ] Effect.runPromiseExit
- [ ] Effect.runSync
- [ ] Effect.runSyncEither
- [ ] Effect.runSyncExit
- [ ] Effect.runtime
- [ ] Effect.runtimeFlags
- [x] Effect.sandbox
- [ ] Effect.schedule
- [ ] Effect.scheduleForked
- [ ] Effect.scheduleFrom
- [ ] Effect.scope
- [ ] Effect.scopeWith
- [ ] Effect.scoped
- [ ] Effect.sequentialFinalizers
- [ ] Effect.service
- [ ] Effect.serviceWith
- [ ] Effect.serviceWithEffect
- [ ] Effect.setConfigProvider
- [ ] Effect.setFiberRefs
- [ ] Effect.sleep
- [ ] Effect.some
- [ ] Effect.someOrElse
- [ ] Effect.someOrElseEffect
- [ ] Effect.someOrFail
- [ ] Effect.someOrFailException
- [ ] Effect.someWith
- [ ] Effect.succeedLeft
- [ ] Effect.succeedNone
- [ ] Effect.succeedRight
- [ ] Effect.succeedSome
- [ ] Effect.summarized
- [ ] Effect.supervised
- [ ] Effect.suspend
- [ ] Effect.sync
- [ ] Effect.tagged
- [ ] Effect.taggedScoped
- [ ] Effect.taggedScopedWithLabelSet
- [ ] Effect.taggedScopedWithLabels
- [ ] Effect.taggedWithLabelSet
- [ ] Effect.taggedWithLabels
- [ ] Effect.tags
- [ ] Effect.takeWhile
- [ ] Effect.tap
- [ ] Effect.tapBoth
- [ ] Effect.tapDefect
- [ ] Effect.tapEither
- [ ] Effect.tapError
- [ ] Effect.tapErrorCause
- [ ] Effect.tapSome
- [ ] Effect.timed
- [ ] Effect.timedWith
- [ ] Effect.timeout
- [ ] Effect.timeoutFail
- [ ] Effect.timeoutFailCause
- [ ] Effect.timeoutTo
- [ ] Effect.toLayer
- [ ] Effect.toLayerContext
- [ ] Effect.toLayerDiscard
- [ ] Effect.toLayerScoped
- [ ] Effect.toLayerScopedDiscard
- [ ] Effect.transplant
- [ ] Effect.tryCatch
- [ ] Effect.tryCatchPromise
- [ ] Effect.tryCatchPromiseInterrupt
- [ ] Effect.tryOrElse
- [ ] Effect.tryPromise
- [ ] Effect.tryPromiseInterrupt
- [ ] Effect.uncause
- [ ] Effect.unfold
- [ ] Effect.unified
- [ ] Effect.uninterruptible
- [ ] Effect.uninterruptibleMask
- [ ] Effect.unit
- [ ] Effect.unleft
- [ ] Effect.unless
- [ ] Effect.unlessEffect
- [ ] Effect.unrefine
- [ ] Effect.unrefineWith
- [ ] Effect.unright
- [ ] Effect.unsandbox
- [ ] Effect.unsome
- [ ] Effect.updateFiberRefs
- [ ] Effect.updateRuntimeFlags
- [ ] Effect.updateService
- [ ] Effect.using
- [ ] Effect.validate
- [ ] Effect.validateAll
- [ ] Effect.validateAllDiscard
- [ ] Effect.validateAllPar
- [ ] Effect.validateAllParDiscard
- [ ] Effect.validateFirst
- [ ] Effect.validateFirstPar
- [ ] Effect.validatePar
- [ ] Effect.validateWith
- [ ] Effect.validateWithPar
- [ ] Effect.when
- [ ] Effect.whenCase
- [ ] Effect.whenCaseEffect
- [ ] Effect.whenEffect
- [ ] Effect.whenFiberRef
- [ ] Effect.whenRef
- [ ] Effect.whileLoop
- [ ] Effect.withClock
- [ ] Effect.withClockScoped
- [ ] Effect.withConfigProvider
- [ ] Effect.withConfigProviderScoped
- [ ] Effect.withEarlyRelease
- [ ] Effect.withMetric
- [ ] Effect.withParallelism
- [ ] Effect.withParallelismUnbounded
- [ ] Effect.withRuntimeFlags
- [ ] Effect.withRuntimeFlagsScoped
- [ ] Effect.yieldNow
- [ ] Effect.zip
- [ ] Effect.zipLeft
- [ ] Effect.zipPar
- [ ] Effect.zipParLeft
- [ ] Effect.zipParRight
- [ ] Effect.zipRight
- [ ] Effect.zipWith
- [ ] Effect.zipWithPar