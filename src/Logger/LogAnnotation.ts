export interface LogAnnotation {
  readonly label: string
  readonly value: string
}

export function LogAnnotation(label: string, value: string): LogAnnotation {
  return { label, value }
}
