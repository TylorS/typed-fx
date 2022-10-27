import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const casesDir = join(currentDir, '/cases')

export const runPerfTestPath = join(currentDir, 'runPerfTest.ts')
export const readmeBasePath = join(currentDir, 'readme-base.md')
export const readmePath = join(currentDir, 'readme.md')
export const fileNames = fs.readdirSync(casesDir).map((x) => basename(x))

let readmeContent = fs.readFileSync(readmeBasePath, 'utf-8').toString()

for (const fileName of fileNames) {
  console.log('Running', 'cases/' + basename(fileName), '\n')

  const { stdout } = spawnSync(`node`, [
    `--loader`,
    `@esbuild-kit/esm-loader`,
    `${runPerfTestPath}`,
    `${fileName}`,
  ])

  const output = stdout.toString()

  console.log(output)

  readmeContent += output
}

if (fs.existsSync(readmePath)) {
  fs.unlinkSync(readmePath)
}

fs.writeFileSync(readmePath, readmeContent)
