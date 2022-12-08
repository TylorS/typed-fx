import { TestSuiteResult, printTestSuiteResult } from '../tools/benchmark.js'

import { isMain } from './helpers.js'

export const results: readonly TestSuiteResult[] = await runSequentially([
  () => import('./cases/filter-map-reduce.js').then((x) => x.result),
  () => import('./cases/flatMap.js').then((x) => x.result),
  () => import('./cases/switchMap.js').then((x) => x.result),
])

if (isMain(import.meta)) {
  console.log('\n\n')
  console.log(results.map(printTestSuiteResult).join('\n\n'))
}

async function runSequentially<Promises extends ReadonlyArray<() => Promise<any>>>(
  tasks: Promises,
): Promise<{ readonly [K in keyof Promises]: Awaited<ReturnType<Promises[K]>> }> {
  const results: any[] = []
  for (const task of tasks) {
    results.push(await task())
  }

  return results as any
}
