const NEWLINE_REGEX = /\r?\n/g

export function prettyStringify(x: unknown, depth = 2): string {
  const replacement = '\n'.padEnd(1 + depth, ' ')

  // Optional chain is need for passing `undefined` to JSON.stringify returns `undefined`.
  return JSON.stringify(x, null, 2)?.replace(NEWLINE_REGEX, replacement) ?? ''
}
