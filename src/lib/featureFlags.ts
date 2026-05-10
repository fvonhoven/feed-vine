/**
 * Build-time feature flags (Vite: set in .env as VITE_*).
 * Defaults favor a minimal launch surface; enable flags when you are ready to roll out.
 */

function parseEnvBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === "") return defaultValue
  const v = raw.toLowerCase()
  if (["1", "true", "yes", "on"].includes(v)) return true
  if (["0", "false", "no", "off"].includes(v)) return false
  return defaultValue
}

export const featureFlags = {
  /** Team workspaces, team pricing tiers, Slack/Discord bots tied to teams */
  teams: parseEnvBool(import.meta.env.VITE_TEAMS_ENABLED, false),
} as const

export type FeatureFlags = typeof featureFlags
