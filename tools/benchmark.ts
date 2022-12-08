import tablemark from 'tablemark'

export interface PerformanceTestCase<A> {
  readonly name: string
  readonly init: () => A
  readonly run: (a: A) => unknown | Promise<unknown>
}

export function PerformanceTestCase<A>(
  name: string,
  init: () => A,
  run: (a: A) => Promise<unknown>,
): PerformanceTestCase<A> {
  return { name, init, run }
}

export interface TestStats {
  readonly average: number
  readonly min: number
  readonly max: number
  readonly timeToInit: number
  readonly percentile: number
}

export function TestStats(
  average: number,
  min: number,
  max: number,
  timeToInit: number,
  percentile: number,
): TestStats {
  return { average, min, max, timeToInit, percentile }
}

export interface TestSuite {
  readonly name: string
  readonly tests: ReadonlyArray<PerformanceTestCase<any>>
}

export function TestSuite(name: string, tests: ReadonlyArray<PerformanceTestCase<any>>): TestSuite {
  return { name, tests }
}

export interface TestSuiteResult {
  readonly name: string
  readonly stats: Readonly<Record<string, TestStats>>
}

export function TestSuiteResult(
  name: string,
  stats: Readonly<Record<string, TestStats>>,
): TestSuiteResult {
  return { name, stats }
}

export interface RunTestConfig {
  readonly iterations: number
  readonly getTime: () => number
}

export function RunTestConfig(iterations: number, getTime: () => number): RunTestConfig {
  return { iterations, getTime }
}

export function runTestCaseWith(config: RunTestConfig) {
  return async <A>(test: PerformanceTestCase<A>): Promise<Readonly<Record<string, TestStats>>> => {
    const { iterations, getTime } = config
    const initStartTime = getTime()
    const init = test.init()
    const initEndTime = getTime()

    let total = 0
    let min = Infinity
    let max = 0

    console.log(`Running ${test.name}...`)

    for (let i = 0; i < iterations; i++) {
      console.log(`Running ${test.name} (${i + 1} of ${iterations})`)
      const startTime = getTime()
      await test.run(init)
      const endTime = getTime()
      const elapsed = endTime - startTime

      total += elapsed

      if (elapsed < min) {
        min = elapsed
      } else if (elapsed > max) {
        max = elapsed
      }
    }

    return {
      [test.name]: TestStats(
        roundNumber(total / iterations),
        roundNumber(min),
        roundNumber(max),
        roundNumber(initEndTime - initStartTime),
        -1,
      ),
    }
  }
}

export async function runTestSuite(
  suite: TestSuite,
  config: RunTestConfig,
): Promise<TestSuiteResult> {
  let results: Record<string, TestStats> = {}
  const runTestCase = runTestCaseWith(config)

  console.log(`\n\nRunning ${suite.name}...`)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  for (const test of suite.tests) {
    results = { ...results, ...(await runTestCase(test)) }
  }

  return TestSuiteResult(suite.name, addPercentile(results))
}

function roundNumber(n: number): number {
  return parseFloat(n.toFixed(4))
}

function addPercentile(
  stats: Readonly<Record<string, TestStats>>,
): Readonly<Record<string, TestStats>> {
  const newStats: Record<string, TestStats> = {}

  const fastestToSlowest = Object.entries(stats).sort(([, a], [, b]) => a.average - b.average)
  const fastestTime = fastestToSlowest[0][1].average

  for (let i = 0; i < fastestToSlowest.length; ++i) {
    const [name, stat] = fastestToSlowest[i]
    newStats[name] = TestStats(
      stat.average,
      stat.min,
      stat.max,
      stat.timeToInit,
      roundNumber(stat.average / fastestTime),
    )
  }

  return newStats
}

export function printTestSuiteResult(result: TestSuiteResult): string {
  return `## ${result.name}

${tablemark(
  Object.entries(result.stats).map(([library, stats]) => ({
    library,
    ...stats,
  })),
)}
`
}
