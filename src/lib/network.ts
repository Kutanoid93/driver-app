export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true
  if (err instanceof TypeError) return true
  if (err instanceof Error && /fetch|network/i.test(err.message)) return true
  return false
}
