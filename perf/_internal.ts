import { performance } from 'node:perf_hooks'

import { Suite } from 'benchmark'

export function runSuite(suite: Suite) {
  suite.on('start', logStart).on('cycle', logResults).on('complete', logComplete).run()
}

function logResults(e: any) {
  const t = e.target

  if (t.failure) {
    console.error(padl(10, t.name) + 'FAILED: ' + e.target.failure)
  } else {
    const result =
      padl(18, t.name) +
      padr(13, t.hz.toFixed(2) + ' op/s') +
      ' \xb1' +
      padr(7, t.stats.rme.toFixed(2) + '%') +
      padr(15, ' (' + t.stats.sample.length + ' samples)')

    console.log(result)
  }
}

function logStart(this: any) {
  console.log(this.name)
  console.log('-------------------------------------------------------')
}

function logComplete() {
  console.log('-------------------------------------------------------')
  process.exit(0)
}

function padl(n: number, s: string) {
  while (s.length < n) {
    s += ' '
  }
  return s
}

function padr(n: number, s: string) {
  while (s.length < n) {
    s = ' ' + s
  }
  return s
}

export function timeConstruction(label: string) {
  const start = performance.now()
  return () => {
    const end = performance.now()
    console.log(label, end - start)
  }
}
