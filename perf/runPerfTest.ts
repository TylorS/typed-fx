import process from 'node:process'

import { runPerformanceTest } from './_internal.js'

const fileName = process.argv.slice(2).filter((x) => x.trim() !== '--')[0]

async function main() {
  const { name, cases } = await import(
    `./cases/${fileName}${fileName.endsWith('.ts') ? '' : '.ts'}`
  )

  runPerformanceTest({ name, cases }, () => process.exit(0))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
