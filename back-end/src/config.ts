/**
 * Central config module — validates required env vars at startup so the app
 * fails fast with a clear message rather than running in a broken/insecure state.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`FATAL: environment variable "${name}" is not set`)
    process.exit(1)
  }
  return value
}

const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // In production the JWT secret MUST be set explicitly — no weak fallback.
  // In development a local default is accepted so new contributors can run
  // the app without setting up a .env file first.
  jwtSecret: isProduction
    ? requireEnv('JWT_SECRET')
    : (process.env.JWT_SECRET ?? 'dev-only-insecure-secret'),
  isProduction,
}
