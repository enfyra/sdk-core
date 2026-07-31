import { EnfyraError } from '@enfyra/sdk-core'

const SENSITIVE_KEY =
  /authorization|cookie|password|secret|token|api[-_]?key|oauth[-_]?code/i
const JWT_VALUE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return value.replace(JWT_VALUE, '[REDACTED_JWT]')
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)

  if (value instanceof EnfyraError) {
    return {
      code: value.code,
      details: redact(value.details, seen),
      message: value.message,
      name: value.name,
      statusCode: value.statusCode,
    }
  }

  if (value instanceof Error) {
    return {
      message: redact(value.message, seen),
      name: value.name,
    }
  }

  if (Array.isArray(value)) return value.map((item) => redact(item, seen))

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(item, seen),
    ]),
  )
}
